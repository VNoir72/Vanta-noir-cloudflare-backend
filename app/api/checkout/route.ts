import {ownedCard,startSavedCardPayment} from '@/lib/customer-cards';
import {appSession,linkAppOrder} from '@/lib/customer-app';
import {startTransferPayment} from '@/lib/custom-transfer';
import {runtimeEnv,liveShippingForCountry} from '@/lib/runtime-env';
import {resolveShippingSelection,shippingSelectionSchema,ShippingInputError} from '@/lib/shipping-checkout';
import { checkoutCustomerSchema } from "@/lib/checkout-address";
import { z } from "zod";
import { getCommerceSettings, rateLimit } from "@/lib/commerce-db";
import { shippingQuote, checkoutSetupIssues } from "@/lib/commerce-config";

import { isPaystackConfigured } from "@/lib/paystack";
import { configuredShippingFeeKobo, storefrontOrigin,shipbubbleCheckoutEnabled } from "@/lib/runtime-env";
import { startCheckoutPayment } from "@/lib/checkout-payment";
import { createPendingOrder } from "@/lib/store-db";

const checkoutSchema = z.object({
  client:z.enum(["web","native"]).default("web"),
  paymentChannel:z.enum(['hosted','bank_transfer','saved_card']).default('hosted'),
  savedCardId:z.string().min(1).max(120).optional(),
  shippingSelection:shippingSelectionSchema.optional(),
  checkoutAttempt: z.string().regex(/^[-a-f0-9]{73}$/).optional(),
  rewardCode: z.string().trim().toUpperCase().max(48).default(""),
  expectedRewardSignature: z.string().max(300).default(""),
  promotionCode: z.string().trim().toUpperCase().max(32).default(""),
  expectedTotalKobo: z.number().int().positive().max(100_000_000_000),
  customer: checkoutCustomerSchema,
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
  if(parsed.data.paymentChannel==='bank_transfer'&&runtimeEnv().CUSTOM_TRANSFER_ENABLED!=='true')return Response.json({error:'Custom bank-transfer payments are not available yet.'},{status:503});
  const session=await appSession(request);
  if(parsed.data.client==='native'||parsed.data.paymentChannel==='saved_card'||request.headers.has('Authorization')){if(!session||session.email!==parsed.data.customer.email.trim().toLowerCase())return Response.json({error:'Sign in again and use your account email.'},{status:401});}
  if(parsed.data.paymentChannel==='saved_card'&&(!parsed.data.savedCardId||!session||!await ownedCard(session.id,parsed.data.savedCardId)))return Response.json({error:'Choose an available saved card.'},{status:400});
  const settings = await getCommerceSettings();
  if (!settings.acceptingOrders || checkoutSetupIssues(settings, true, configuredShippingFeeKobo(),shipbubbleCheckoutEnabled()).length) {
    return Response.json({error:"Online orders are not open yet. Please contact customer care.",code:"STORE_NOT_READY"},{status:503});
  }
  const delivery = shippingQuote({...settings, shippingFeeKobo: configuredShippingFeeKobo()}, parsed.data.customer.state, parsed.data.customer.countryCode);
  try {
    const liveCourier=await liveShippingForCountry(parsed.data.customer.countryCode);
    if(parsed.data.shippingSelection&&!liveCourier)throw new ShippingInputError('Live courier selection is not enabled for this checkout.');
    if(liveCourier&&!parsed.data.shippingSelection)throw new ShippingInputError('Wait for shipping to be calculated before paying.');
    const selected=liveCourier?await resolveShippingSelection(parsed.data.shippingSelection!,parsed.data,Boolean(parsed.data.checkoutAttempt)):undefined;
    const shippingKobo=selected?selected.rate.amountKobo:delivery.feeKobo;
    if(shippingKobo===null)throw new ShippingInputError('Delivery is unavailable for this address.');
    const {paymentChannel:_channel,client:_client,savedCardId:_card,...orderInput}=parsed.data;
    const order = await createPendingOrder({
      ...orderInput,
      shippingKobo,
      deliveryEstimate: selected?selected.rate.delivery:delivery.estimate,
      shippingQuote:selected,
    });
    if(request.headers.has('Authorization'))await linkAppOrder(request,order.reference,parsed.data.customer.email);
    if(parsed.data.paymentChannel==='saved_card')return Response.json(await startSavedCardPayment(order.reference,order.receiptToken,session!.id,parsed.data.savedCardId!),{headers:{'Cache-Control':'no-store'}});
    if(parsed.data.paymentChannel==='bank_transfer')return Response.json(await startTransferPayment(order.reference,order.receiptToken),{headers:{'Cache-Control':'no-store'}});
    const callbackUrl = new URL("/checkout/complete", storefrontOrigin(request)).toString();

    return Response.json(await startCheckoutPayment({
      email:parsed.data.customer.email,customerName:`${parsed.data.customer.firstName} ${parsed.data.customer.lastName}`,
      reference:order.reference,receiptToken:order.receiptToken,callbackUrl,
    }),{headers:{'Cache-Control':'no-store'}});
  } catch (error) {
    const message = error instanceof ShippingInputError ? error.message : error instanceof Error && /no longer available|insufficient stock|prices or delivery|reserved|bag is invalid|promotion|reward/.test(error.message)
      ? error.message : "Checkout could not be created. Please refresh your bag and try again.";
    return Response.json({ error: message }, { status: 400 });
  }
}
