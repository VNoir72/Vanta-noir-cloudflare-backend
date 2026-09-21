import { getCommerceSettings } from "@/lib/commerce-db";
import { listCatalog } from "@/lib/store-db";
import { configuredShippingFeeKobo } from "@/lib/runtime-env";
import { isPaystackConfigured } from "@/lib/paystack";
import { checkoutSetupIssues } from "@/lib/commerce-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [products, settings] = await Promise.all([listCatalog(), getCommerceSettings()]);
    return Response.json({ products, checkout: {
      shippingFeeKobo: configuredShippingFeeKobo(), paymentsEnabled: isPaystackConfigured(), shippingCountry: "Nigeria", ...settings,
      checkoutReady: settings.acceptingOrders && checkoutSetupIssues(settings, isPaystackConfigured(), configuredShippingFeeKobo()).length === 0,
    } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "The catalogue is temporarily unavailable." }, { status: 500 });
  }
}
