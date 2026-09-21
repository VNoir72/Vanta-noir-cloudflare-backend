import { markOrderPaid } from "@/lib/store-db";
import { verifyPaystackWebhook } from "@/lib/paystack";

type PaystackWebhook = {
  event?: string;
  data?: {
    id?: number;
    status?: string;
    amount?: number;
    currency?: string;
    reference?: string;
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verified = await verifyPaystackWebhook(
    rawBody,
    request.headers.get("x-paystack-signature"),
  );
  if (!verified) return new Response("Invalid signature", { status: 401 });

  let event: PaystackWebhook;
  try {
    event = JSON.parse(rawBody) as PaystackWebhook;
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  if (
    event.event === "charge.success" &&
    event.data?.status === "success" &&
    event.data.currency === "NGN" &&
    typeof event.data.amount === "number" &&
    event.data.reference
  ) {
    try {
      await markOrderPaid({
        reference: event.data.reference,
        amountKobo: event.data.amount,
        eventKey: `webhook:${event.data.id ?? event.data.reference}`,
        eventType: event.event,
      });
    } catch {
      return new Response("Unable to apply payment", { status: 500 });
    }
  }

  return new Response("ok");
}
