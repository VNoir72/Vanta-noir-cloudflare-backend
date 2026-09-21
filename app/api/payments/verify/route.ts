import { verifyPaystackTransaction } from "@/lib/paystack";
import { getOrderByReference, getPublicPaymentOrder, markOrderPaid } from "@/lib/store-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference")?.trim();
  if (!reference || reference.length > 120) {
    return Response.json({ error: "A valid payment reference is required." }, { status: 400 });
  }

  try {
    const existing = await getOrderByReference(reference);
    if (!existing) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }
    if (existing.paymentStatus === "paid") {
      return Response.json({ order: await getPublicPaymentOrder(reference) }, { headers: { "Cache-Control": "no-store" } });
    }

    const transaction = await verifyPaystackTransaction(reference);
    if (
      transaction.status !== "success" ||
      transaction.currency !== "NGN" ||
      transaction.reference !== reference
    ) {
      return Response.json({
        order: await getPublicPaymentOrder(reference),
        message: "Payment has not been confirmed yet.",
      });
    }

    await markOrderPaid({
      reference,
      amountKobo: transaction.amount,
      eventKey: `verify:${reference}`,
      eventType: "verify.success",
    });
    return Response.json({ order: await getPublicPaymentOrder(reference) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "Payment confirmation is temporarily unavailable." },
      { status: 502 },
    );
  }
}
