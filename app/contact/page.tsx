import { ContactCarePage } from "../storefront";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("contact");

export const dynamic = "force-static";

export default function ContactPage() {
  return <ContactCarePage />;
}
