import { LegalPage } from "@/app/legal/legal-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("terms");

export const dynamic = "force-static";

export default function TermsOfServicePage() {
  return <LegalPage document="terms" />;
}
