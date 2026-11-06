"use client";
import { AppAccessPreview } from "./app-access-preview";
import { useEffect,useState,type ReactNode } from "react";
import { PageBag } from './page-bag';
import { StoreHeader } from "./store-header";
import { CART_STORAGE_KEY,restoreCart } from "@/lib/cart";
import { readStorage } from "@/lib/browser-store";
import { validAudience,collectionLink } from "@/lib/catalog-browsing";
import { CustomerSignup } from "./customer-signup";
import { NewsletterPopup } from "./newsletter-popup";
import { useStoreSettings } from "@/lib/store-settings";
import { PaymentMethods } from "./payment-methods";
function useDepartment() {
  const [audience,setAudience]=useState("All");
  useEffect(()=>{try {setAudience(validAudience(sessionStorage.getItem("vn-shop-audience")) ?? "All");}catch{}},[]);
  return audience;
}

export function StoreFooter({ department }: { department?: string } = {}) {
  const settings=useStoreSettings();
  const remembered=useDepartment();
  const audience=department ?? remembered;
  return <footer className="vn-reference-footer dn-wrap">
    <div className="vn-footer-line"><a className="vn-footer-wordmark" href="/">VANTA NOIR</a><nav aria-label="Footer"><a href="/account">Account</a><a href="/?saved=1">Saved pieces</a><a href="/help-center">Help</a><a href="/shipping-returns">Shipping & returns</a><details><summary>More</summary><div><a href="/about">About Vanta Noir</a><a href="/contact">Contact us</a><a href="/reviews">Customer reviews</a><a href="/privacy-policy">Privacy</a><a href="/terms-of-service">Terms</a><a href="/privacy-choices">Cookie choices</a></div></details></nav></div>
    <details className="vn-footer-news"><summary>Collection updates</summary><CustomerSignup label="Be first to hear what’s next"/></details>
    <p className="vn-footer-legal">© {new Date().getFullYear()} Vanta Noir · Nigeria</p>
  </footer>;
}
export function StoreShell({ children, checkout = false }: { children: ReactNode; checkout?: boolean }) {
  const audience=useDepartment();
  const [query,setQuery]=useState("");
  const [bagOpen,setBagOpen]=useState(false);
  useEffect(()=>{const open=()=>setBagOpen(true);window.addEventListener("vn-open-bag",open);return()=>window.removeEventListener("vn-open-bag",open);},[]);
  const [counts,setCounts]=useState({bag:0,saved:0});
  useEffect(()=>{
    const update=()=>{
      let bag=0,saved=0;
      try{bag=restoreCart(JSON.parse(readStorage(CART_STORAGE_KEY)||'[]')).reduce((n,item)=>n+item.quantity,0);}catch{}
      try{const value=JSON.parse(readStorage('vn-discover-saved-v1')||'[]');if(Array.isArray(value))saved=new Set(value.filter(v=>typeof v==='string')).size;}catch{}
      setCounts({bag,saved});
    };
    update();
    window.addEventListener('storage',update);
    window.addEventListener('pageshow',update);
    window.addEventListener('vn-storage-changed',update);
    return()=>{window.removeEventListener('storage',update);window.removeEventListener('pageshow',update);window.removeEventListener('vn-storage-changed',update);};
  },[]);
  return <div className={`dn-app dn-customer-app vn-store-refresh vn-floating-site${checkout ? " vn-checkout-shell" : ""}`}><a className="dn-skip" href="#main-content">Skip to content</a>
    <StoreHeader query={query} onQuery={setQuery} bagCount={counts.bag} savedCount={counts.saved} onSearch={()=>{window.location.href=collectionLink({audience,category:'All',collection:'All',query});}} onSaved={()=>{window.location.href=`/?audience=${audience}&saved=1#collection`;}} onBag={()=>setBagOpen(true)}/>
    <main id="main-content" className="dn-customer-main dn-wrap">{children}</main><StoreFooter department={audience}/><PageBag open={bagOpen} onOpenChange={setBagOpen}/>
  </div>;
}
