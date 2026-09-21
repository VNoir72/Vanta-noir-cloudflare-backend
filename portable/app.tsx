import { AnalyticsConsent } from "@/components/analytics-consent";
import { EmailPreferences } from "@/app/email-preferences/preferences";
import { useEffect, useState } from "react";
import { Storefront, ContactCarePage } from "@/app/storefront";
import About from "@/app/about/page";
import { HelpCenter } from "@/app/help-center/help-center";
import { PrivacyPolicy } from "@/app/privacy-policy/privacy-policy";
import { LegalPage } from "@/app/legal/legal-page";
import Reviews from "@/app/reviews/page";
import Studio from "@/app/case-studies/page";
import NotFound from "@/app/not-found";
import { PaymentCompletion } from "@/components/payment-completion";
import { CheckoutForm } from "@/app/checkout/checkout-form";
import { STORE_SIZES, type CatalogProduct } from "@/lib/catalog";

function CheckoutComplete() {
  const [reference, setReference] = useState<string | null>(null);
  useEffect(() => { setReference(new URL(window.location.href).searchParams.get("reference") ?? ""); }, []);
  return <PaymentCompletion reference={reference}/>;
}

export function App({path,products}:{path:string;products:CatalogProduct[]}) {
  const [currentPath,setCurrentPath]=useState(path);
  useEffect(()=>{if(path==="/products/_dynamic")setCurrentPath(window.location.pathname);},[path]);
  return <><AppRoutes path={currentPath} products={products}/><AnalyticsConsent/></>;
}
function AppRoutes({ path, products }: { path: string; products: CatalogProduct[] }) {
  if(/^\/products\/[a-z0-9_-]+\/?$/.test(path)) return <Storefront products={products} sizes={[...STORE_SIZES]} detailSlug={path.split("/")[2]}/>;
  switch (path.replace(/\/+$/, "") || "/") {
    case "/": return <Storefront products={products} sizes={[...STORE_SIZES]} />;
    case "/about": return <About />;
    case "/contact": return <ContactCarePage />;
    case "/help-center": return <HelpCenter />;
    case "/privacy-policy": return <PrivacyPolicy />;
    case "/privacy-choices": return <LegalPage document="privacy-choices" />;
    case "/shipping-returns": return <LegalPage document="shipping-returns" />;
    case "/terms-of-service": return <LegalPage document="terms" />;
    case "/reviews": return <Reviews />;
    case "/case-studies": return <Studio />;
    case "/email-preferences": return <EmailPreferences />;
    case "/checkout": return <CheckoutForm/>;
    case "/checkout/complete": return <CheckoutComplete />;
    default: return <NotFound />;
  }
}
