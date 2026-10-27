import {KeyboardViewport} from "@/components/keyboard-viewport";
import {StorefrontMotion} from "@/components/storefront-motion";
import {AnalyticsConsent} from "@/components/analytics-consent";
import type {ReactNode} from "react";
import {STORE_SIZES,type CatalogProduct} from "@/lib/catalog-runtime";

export function App({children}:{children:ReactNode}) {
  return <>{children}<AnalyticsConsent/><StorefrontMotion/><KeyboardViewport/></>;
}
export async function routePage(path:string,products:CatalogProduct[]):Promise<ReactNode> {
  if(path==='/' || /^\/products\/[a-z0-9_-]+\/?$/.test(path)) {
    const {Storefront}=await import('@/app/storefront');
    return <Storefront products={products} sizes={[...STORE_SIZES]} detailSlug={path==='/'?undefined:path.split('/')[2]}/>;
  }
  switch(path.replace(/\/+$/, '')||'/') {
    case '/account': {const {AccountPage}=await import('@/app/account/account');return <AccountPage/>;}
    case '/about': {const {AboutContent}=await import('@/components/customer-pages');return <AboutContent/>;}
    case '/contact': {const {ContactCarePage}=await import('@/app/storefront');return <ContactCarePage/>;}
    case '/help-center': {const {HelpCenter}=await import('@/app/help-center/help-center');return <HelpCenter/>;}
    case '/privacy-policy': {const {PrivacyPolicy}=await import('@/app/privacy-policy/privacy-policy');return <PrivacyPolicy/>;}
    case '/privacy-choices': case '/shipping-returns': case '/terms-of-service': {
      const {LegalPage}=await import('@/app/legal/legal-page');
      return <LegalPage document={path==='/terms-of-service'?'terms':path==='/shipping-returns'?'shipping-returns':'privacy-choices'}/>;
    }
    case '/reviews': {const {default:Reviews}=await import('@/app/reviews/page');return <Reviews/>;}
    case '/case-studies': {const {default:Studio}=await import('@/app/case-studies/page');return <Studio/>;}
    case '/email-preferences': {const {EmailPreferences}=await import('@/app/email-preferences/preferences');return <EmailPreferences/>;}
    case '/checkout': {const {CheckoutForm}=await import('@/app/checkout/checkout-form');return <CheckoutForm/>;}
    case '/checkout/complete': {const {CheckoutComplete}=await import('./checkout-complete');return <CheckoutComplete/>;}
    default: {const {default:NotFound}=await import('@/app/not-found');return <NotFound/>;}
  }
}
