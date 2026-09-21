import { HelpCenter } from "./help-center";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("help");

export const dynamic = "force-static";

export default function HelpCenterPage() {
  return <HelpCenter />;
}
