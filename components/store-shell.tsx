"use client";
import { useEffect, useState, type ReactNode } from "react";
import { SHOP_SECTIONS } from "@/lib/shop-categories";
import { validAudience, collectionLink } from "@/lib/catalog-browsing";
function useDepartment() {
  const [audience,setAudience]=useState("All");
  useEffect(()=>{try {setAudience(validAudience(sessionStorage.getItem("vn-shop-audience")) ?? "All");}catch{}},[]);
  return audience;
}
import { ArrowRight, Heart, HelpCircle, Search, ShoppingBag } from "lucide-react";
import { CustomerSignup } from "./customer-signup";
import { useStoreSettings } from "@/lib/store-settings";

export function StoreFooter({ department }: { department?: string } = {}) {
  const settings=useStoreSettings();
  const remembered=useDepartment();
  const audience=department ?? remembered;
  return <footer className="dn-footer dn-wrap">
    <div><a className="dn-footer-wordmark" href={collectionLink({audience,category:"All",collection:"All",query:""})}>VANTA NOIR</a><p>Presence. Power. Precision.</p><p>Nigeria · NGN ₦</p></div>
    <div><span>GET TO KNOW US</span><a href="/about">Our identity</a><a href="/reviews">Customer reviews</a><a href="https://www.instagram.com/the_vanta_noir" target="_blank" rel="noreferrer">Instagram ↗</a><a href="https://www.tiktok.com/@the_vanta_noir" target="_blank" rel="noreferrer">TikTok ↗</a><a href="https://x.com/vanta_noir72" target="_blank" rel="noreferrer">X ↗</a></div>
    <div><span>HERE TO HELP</span><a href="/help-center#track-order">Track your order</a><a href="/help-center#sizing">Size & fit</a><a href="/shipping-returns">Delivery & returns</a><a href="/contact">Contact & support</a></div>
    {settings.emailEnabled&&<div className="dn-newsletter"><CustomerSignup/></div>}
    <div className="dn-footer-bottom"><span>© {new Date().getFullYear()} Vanta Noir</span><a href="/terms-of-service">Terms</a><a href="/privacy-policy">Privacy</a><a href="/privacy-choices">Cookie choices</a></div>
  </footer>;
}
export function StoreShell({ children }: { children: ReactNode }) {
  const audience=useDepartment();
  const shop=(category="All")=>collectionLink({audience,category,collection:"All",query:""});
  return <div className="dn-app dn-customer-app"><a className="dn-skip" href="#main-content">Skip to content</a>
    <div className="dn-announcement"><span><span className="dn-dot" />Built to move. Made to stand out.</span><span>NIGERIA · NGN ₦</span></div>
    <header className="dn-header"><div className="dn-mainbar dn-wrap"><a className="dn-logo" href={shop()} aria-label="Vanta Noir home"><img src="/images/vanta-noir-header-logo-480.webp" alt="" /><span>VANTA NOIR<small>PRESENCE. POWER. PRECISION.</small></span></a>
      <form className="dn-search" action="/" role="search"><input type="hidden" name="audience" value={audience}/><Search size={19} /><input name="q" aria-label="Search the collection" placeholder="Search hoodies, tracksuits, colours…" maxLength={120} /><button className="dn-search-submit" aria-label="Search"><ArrowRight size={18}/></button></form>
      <nav className="dn-header-actions" aria-label="Your shopping"><a href="/help-center" aria-label="Help"><HelpCircle/><span>Help</span></a><a href={`/?audience=${audience}&saved=1#collection`} aria-label="Saved items"><Heart/><span>Saved</span></a><a href={`/?audience=${audience}&bag=1`} aria-label="Your bag"><ShoppingBag/><span>Bag</span></a></nav>
    </div><nav className="dn-categories dn-wrap" aria-label="Shop by category"><a href={shop()}>Shop all</a>{SHOP_SECTIONS.map(section=><a key={section} href={shop(section)}>{section}</a>)}</nav></header>
    <main id="main-content" className="dn-customer-main dn-wrap">{children}</main><StoreFooter department={audience}/>
  </div>;
}
