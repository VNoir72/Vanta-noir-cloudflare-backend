import { z } from "zod";
import { getCommerceSettings, rateLimit } from "@/lib/commerce-db";
import { shippingQuote, checkoutSetupIssues, NIGERIA_STATES } from "@/lib/commerce-config";

import { initializePaystackTransaction, isPaystackConfigured } from "@/lib/paystack";
import { configuredShippingFeeKobo, storefrontOrigin } from "@/lib/runtime-env";
import { createPendingOrder, markOrderPaymentError } from "@/lib/store-db";

const checkoutSchema = z.object({
  promotionCode: z.string().trim().toUpperCase().max(32).default(""),
  expectedTotalKobo: z.number().int().positive().max(100_000_000_000),
  customer: z.object({
    email: z.string().trim().email().max(200),
    firstName: z.string().trim().min(2).max(80),
    lastName: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(7).max(30),
    addressLine1: z.string().trim().min(5).max(240),
    addressLine2: z.string().trim().max(240).default(""),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().refine(value => NIGERIA_STATES.includes(value)),
  }),
  cart: z
    .array(
      z.object({
        variantId: z.string().trim().min(3).max(120),
        quantity: z.number().int().min(1).max(5),
      }),
    )
    .min(1)
    .max(20)
    .refine(
      (items) => new Set(items.map((item) => item.variantId)).size === items.length,
      "Duplicate cart variants are not allowed.",
    ),
});

export async function POST(request: Request) {
  if (!isPaystackConfigured()) {
    return Response.json(
      {
        error:
          "Online payments are not available yet. Please contact customer care.",
        code: "PAYSTACK_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }


  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Please check the checkout information and try again." },
      { status: 400 },
    );
  }

  if (!await rateLimit(request, "checkout", 20, 600)) return Response.json({error:"Please wait before starting another checkout."},{status:429});
  const settings = await getCommerceSettings();
  if (!settings.acceptingOrders || checkoutSetupIssues(settings, true, configuredShippingFeeKobo()).length) {
    return Response.json({error:"Online orders are not open yet. Please contact customer care.",code:"STORE_NOT_READY"},{status:503});
  }
  const delivery = shippingQuote({...settings, shippingFeeKobo: configuredShippingFeeKobo()}, parsed.data.customer.state);
  const shippingKobo = delivery.feeKobo;
  if (shippingKobo === null) return Response.json({error:"Delivery is not available for this address. Please contact customer care."},{status:400});
  try {
    const order = await createPendingOrder({
      ...parsed.data,
      shippingKobo,
      deliveryEstimate: delivery.estimate,
    });
    const callbackUrl = new URL("/checkout/complete", storefrontOrigin(request)).toString();

    try {
      const transaction = await initializePaystackTransaction({
        email: parsed.data.customer.email,
        amountKobo: order.totalKobo,
        reference: order.reference,
        callbackUrl,
        customerName: `${parsed.data.customer.firstName} ${parsed.data.customer.lastName}`,
      });
      return Response.json({
        authorizationUrl: transaction.authorization_url,
        reference: order.reference,
      });
    } catch {
      await markOrderPaymentError(order.reference);
      return Response.json(
        { error: "Paystack could not start the payment. Please try again." },
        { status: 502 },
      );
    }
  } catch (error) {
    const message = error instanceof Error && /no longer available|insufficient stock|prices or delivery|reserved|bag is invalid|promotion/.test(error.message)
      ? error.message : "Checkout could not be created. Please refresh your bag and try again.";
    return Response.json({ error: message }, { status: 400 });
  }
}
