import { canReadReceipt } from "@/lib/receipt-access";
import { rateLimit } from "@/lib/commerce-db";
import { verifyPaystackTransaction } from "@/lib/paystack";
import { getOrderByReference, getPublicPaymentOrder, markOrderPaid } from "@/lib/store-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference")?.trim();
  if (!reference || reference.length > 120) {
    return Response.json({ error: "A valid payment reference is required." }, { status: 400 });
  }

  try {
    if(!await rateLimit(request,"receipt",60,600))return Response.json({error:"Please wait before checking again."},{status:429});
    if(!await canReadReceipt(reference,request.headers.get("X-Receipt-Token")))return Response.json({error:"For your privacy, use Track your order below with your reference and checkout email or phone. Do not pay again."},{status:403});
    const existing = await getOrderByReference(reference);
    if (!existing) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }
    if (existing.paymentStatus === "paid") {
      return Response.json({ order: await getPublicPaymentOrder(reference) }, { headers: { "Cache-Control": "no-store" } });
    }

    const current = await getPublicPaymentOrder(reference);
    // An expired window is terminal for checkout, even during a provider outage.
    // Cron and signed webhooks still reconcile any late money received.
    if (current?.status === 'expired' || current?.status === 'cancelled')
      return Response.json({order:current}, {headers:{'Cache-Control':'no-store'}});
    const transaction = await verifyPaystackTransaction(reference);
    if (
      transaction.status !== "success" ||
      transaction.currency !== "NGN" ||
      transaction.reference !== reference
    ) {
      return Response.json({
        order: await getPublicPaymentOrder(reference),
        message: "Payment has not been confirmed yet.",
        providerStatus: transaction.status,
      });
    }

    await markOrderPaid({
      reference,
      amountKobo: transaction.amount,
      eventKey: `verify:${reference}`,
      eventType: "verify.success",
      paymentDomain: transaction.domain,
      requestedAmountKobo: transaction.requested_amount,
      providerFeesKobo: transaction.fees,
    });
    return Response.json({ order: await getPublicPaymentOrder(reference) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "Payment confirmation is temporarily unavailable." },
      { status: 502 },
    );
  }
}
