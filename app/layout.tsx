import type { Metadata } from "next";
import "./globals.css";
import "./discovery.css";
import "./commerce.css";
import { AnalyticsConsent } from "@/components/analytics-consent";
import { SITE_URL, pageMetadata } from "@/lib/seo";
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" } as const;
export const metadata: Metadata = {
  ...pageMetadata("home"),
  metadataBase: new URL(SITE_URL),
  applicationName: "Vanta Noir",
  title: { default: "Vanta Noir — Discover", template: "%s | Vanta Noir" },
  description: "Discover technical streetwear, matching sets and performance tracksuits from Vanta Noir.",
  robots: { index: false, follow: false },
  category: "fashion",
  icons: { icon: "/images/vanta-noir-emblem-480.webp" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<AnalyticsConsent/></body></html>;
}
