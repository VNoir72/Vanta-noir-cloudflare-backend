import { getCommerceSettings } from "@/lib/commerce-db";
import { listCatalog } from "@/lib/store-db";
import { runtimeEnv,configuredShippingFeeKobo,shipbubbleCheckoutEnabled } from "@/lib/runtime-env";
import { isPaystackConfigured } from "@/lib/paystack";
import { checkoutSetupIssues, publicCommerceSettings } from "@/lib/commerce-config";
import { salesSignals } from '@/lib/merchandising-db';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [products, settings, sales] = await Promise.all([listCatalog(), getCommerceSettings(), salesSignals().catch(()=>[])]);
    const ready=settings.acceptingOrders && settings.inventoryConfirmed && checkoutSetupIssues(settings,isPaystackConfigured(),configuredShippingFeeKobo(),shipbubbleCheckoutEnabled()).length===0;
    return Response.json({ products, merchandising:{sales,stockBadgesEnabled:ready}, checkout: {
      customerAccountsEnabled:runtimeEnv().CUSTOMER_APP_ENABLED==='true',customTransferEnabled:runtimeEnv().CUSTOM_TRANSFER_ENABLED==='true',shipbubbleCheckoutEnabled:shipbubbleCheckoutEnabled(),shippingFeeKobo: configuredShippingFeeKobo(), paymentsEnabled: isPaystackConfigured(), shippingCountry: "Nigeria", ...publicCommerceSettings(settings,shipbubbleCheckoutEnabled()),
      // Live courier prices replace the legacy fixed-fee destination table.
      ...(shipbubbleCheckoutEnabled()?{shippingZones:[]}:{}),
      checkoutReady: settings.acceptingOrders && checkoutSetupIssues(settings, isPaystackConfigured(), configuredShippingFeeKobo(),shipbubbleCheckoutEnabled()).length === 0,
    } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "The catalogue is temporarily unavailable." }, { status: 500 });
  }
}
