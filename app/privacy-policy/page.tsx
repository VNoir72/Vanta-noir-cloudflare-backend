import { PrivacyPolicy } from "./privacy-policy";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("privacy");

export const dynamic = "force-static";

export default function PrivacyPolicyPage() {
  return <PrivacyPolicy />;
}
