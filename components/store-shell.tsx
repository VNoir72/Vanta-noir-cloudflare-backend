"use client";
import { useEffect, useState, type ReactNode } from "react";
import {StoreHeader} from "./store-header";
import { validAudience, collectionLink } from "@/lib/catalog-browsing";
function useDepartment() {
  const [audience,setAudience]=useState("All");
  useEffect(()=>{try {setAudience(validAudience(sessionStorage.getItem("vn-shop-audience")) ?? "All");}catch{}},[]);
  return audience;
}
import { ArrowRight, Heart, HelpCircle, Search, ShoppingBag } from "lucide-react";
import { CustomerSignup } from "./customer-signup";
import { NewsletterPopup } from "./newsletter-popup";
import { useStoreSettings } from "@/lib/store-settings";
import { PaymentMethods } from "./payment-methods";

export function StoreFooter({ department }: { department?: string } = {}) {
  const settings=useStoreSettings();
  const remembered=useDepartment();
  const audience=department ?? remembered;
  return <><section className="dn-wrap dn-panel" aria-label="Collection updates"><CustomerSignup label="Be first to hear what’s next"/></section><footer className="dn-footer dn-wrap">
    <div><a className="dn-footer-wordmark" href={collectionLink({audience,category:"All",collection:"All",query:""})}>VANTA NOIR</a><p>Presence. Power. Precision.</p><p>Nigeria · NGN ₦</p></div>
    <div><span>GET TO KNOW US</span><a href="/">Home</a><a href="/about">About</a><a href="/reviews">Customer reviews</a><a href="https://www.instagram.com/the_vanta_noir" target="_blank" rel="noreferrer">Instagram ↗</a><a href="https://www.tiktok.com/@the_vanta_noir" target="_blank" rel="noreferrer">TikTok ↗</a><a href="https://x.com/vanta_noir72" target="_blank" rel="noreferrer">X ↗</a></div>
    <div><span>HERE TO HELP</span><a href="/help-center#track-order">Track your order</a><a href="/help-center#sizing">Size & fit</a><a href="/shipping-returns">Delivery & returns</a><a href="/contact">Contact & support</a></div>
    <PaymentMethods/>
    <div className="dn-footer-bottom"><span>© {new Date().getFullYear()} Vanta Noir</span><a href="/terms-of-service">Terms</a><a href="/privacy-policy">Privacy Policy</a><a href="/privacy-choices">Cookie choices</a></div>
  </footer>{settings.emailEnabled&&<NewsletterPopup/>}</>;
}
export function StoreShell({ children, checkout = false }: { children: ReactNode; checkout?: boolean }) {
  const audience=useDepartment();
  const [query,setQuery]=useState("");
  return <div className={`dn-app dn-customer-app vn-store-refresh${checkout ? " vn-checkout-shell" : ""}`}><a className="dn-skip" href="#main-content">Skip to content</a>
    <StoreHeader query={query} onQuery={setQuery} onSearch={()=>{window.location.href=collectionLink({audience,category:'All',collection:'All',query});}} onSaved={()=>{window.location.href=`/?audience=${audience}&saved=1#collection`;}} onBag={()=>{window.location.href=`/?audience=${audience}&bag=1`;}}/>
    <main id="main-content" className="dn-customer-main dn-wrap">{children}</main><StoreFooter department={audience}/>
  </div>;
}
