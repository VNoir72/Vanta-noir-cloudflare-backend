import { LegalPage } from "@/app/legal/legal-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("shipping");

export const dynamic = "force-static";

export default function ShippingReturnsPage() {
  return <LegalPage document="shipping-returns" />;
}
