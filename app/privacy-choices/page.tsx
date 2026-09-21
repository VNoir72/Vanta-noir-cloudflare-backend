import { LegalPage } from "@/app/legal/legal-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("choices");

export const dynamic = "force-static";

export default function PrivacyChoicesPage() {
  return <LegalPage document="privacy-choices" />;
}
