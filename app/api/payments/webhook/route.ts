import {circleWebhook} from '@/lib/circle';
import {recordPaymentUpdate} from "@/lib/payment-events";
import { getOrderByReference, markOrderPaid } from "@/lib/store-db";
import { paymentMode, verifyPaystackTransaction, verifyPaystackWebhook } from "@/lib/paystack";

type PaystackWebhook = {
  event?: string;
  data?: {
    domain?: 'test' | 'live';
    id?: number;
    status?: string;
    amount?: number;
    requested_amount?: number | string | null;
    fees?: number | null;
    currency?: string;
    reference?: string;
  };
};

export async function POST(request: Request) {
  if(Number(request.headers.get('content-length'))>1000000)return new Response('Payload too large',{status:413});
  const rawBody = await request.arrayBuffer();
  if(rawBody.byteLength>1000000)return new Response('Payload too large',{status:413});
  const verified = await verifyPaystackWebhook(
    rawBody,
    request.headers.get("x-paystack-signature"),
  );
  if (!verified) return new Response("Invalid signature", { status: 401 });

  let event: PaystackWebhook;
  try {
    event = JSON.parse(new TextDecoder("utf-8", {fatal:true}).decode(rawBody)) as PaystackWebhook;
    if(!event || typeof event!=='object' || Array.isArray(event))throw new Error('Invalid payload');
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  try{if(await circleWebhook(event))return new Response('ok');}catch{return new Response('Unable to apply membership event',{status:500});}

  if (
    event.event === "charge.success" &&
    event.data?.status === "success" &&
    event.data.currency === "NGN" &&
    typeof event.data.amount === "number" &&
    event.data.reference
  ) {
    try {
      let payment = event.data;
      const order = await getOrderByReference(event.data.reference);
      // A valid provider event for another integration must not create an order.
      // A replay must not trigger verification, stock allocation, or fulfillment again.
      if (!order || order.paymentStatus === "paid") return new Response("ok");
      if (payment.domain !== paymentMode() || !Number.isSafeInteger(payment.amount) || payment.amount! <= 0) {
        return new Response("Invalid payment", {status:400});
      }
      if (event.data.amount !== order.totalKobo && event.data.requested_amount == null) {
        const verified = await verifyPaystackTransaction(event.data.reference);
        if (verified.status !== "success" || verified.currency !== "NGN" || verified.reference !== event.data.reference || verified.domain !== paymentMode()) throw new Error("Payment is not verified.");
        payment = verified;
      }
      await markOrderPaid({
        reference: event.data.reference,
        amountKobo: payment.amount!,
        eventKey: `webhook:${event.data.id ?? event.data.reference}`,
        eventType: event.event,
        paymentDomain: payment.domain,
        requestedAmountKobo: payment.requested_amount,
        providerFeesKobo: payment.fees,
      });
    } catch {
      return new Response("Unable to apply payment", { status: 500 });
    }
  }

  if(event.event && event.data){
    try{await recordPaymentUpdate(event.event,event.data as Record<string,unknown>);}catch{return new Response('Unable to record payment update',{status:500});}
  }
  return new Response("ok");
}
