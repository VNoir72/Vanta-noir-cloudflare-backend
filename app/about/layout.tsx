import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("about");

export default function AboutLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
