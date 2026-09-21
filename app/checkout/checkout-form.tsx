"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole, ShoppingBag } from "lucide-react";
import { StoreShell } from "@/components/store-shell";
import StoreImage from "@/components/store-image";
import { apiUrl, type CheckoutSettings } from "@/lib/api-client";
import { CART_STORAGE_KEY, reconcileCart, restoreCart, type CartItem } from "@/lib/cart";
import { formatNaira, type CatalogProduct } from "@/lib/catalog";
import { NIGERIA_STATES, shippingQuote } from "@/lib/commerce-config";
import { readStorage, writeStorage } from "@/lib/browser-store";
import { trackCommerce } from "@/lib/analytics";

export function CheckoutForm() {
  const [cart,setCart]=useState<CartItem[]>([]),[settings,setSettings]=useState<CheckoutSettings|null>(null);
  const [state,setState]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[retry,setRetry]=useState(0);
  const [code,setCode]=useState(""),[promotion,setPromotion]=useState<{code:string;discountKobo:number}|null>(null),[quoting,setQuoting]=useState(false);
  const submitting=useRef(false), tracked=useRef(false);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setError("");
    fetch(apiUrl("/api/catalog"),{cache:"no-store",signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error("The store could not load. Please try again.");return r.json() as Promise<{products:CatalogProduct[];checkout:CheckoutSettings}>;}).then(data=>{
      let old:CartItem[]=[];try{old=restoreCart(JSON.parse(readStorage(CART_STORAGE_KEY)||"[]"));}catch{/* Empty damaged storage. */}
      const next=reconcileCart(old,data.products);if(JSON.stringify(old)!==JSON.stringify(next))setNotice("Your bag was updated to the latest prices and available stock. Please review it before paying.");
      setPromotion(null);setCart(next);setSettings(data.checkout);writeStorage(CART_STORAGE_KEY,JSON.stringify(next));
    }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Please try again.");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[retry]);
  useEffect(()=>{const track=()=>{if(!tracked.current&&cart.length&&readStorage("vanta-noir-analytics-consent")==="granted"&&(window as Window&{gtag?:unknown}).gtag){trackCommerce("begin_checkout",cart);tracked.current=true;}};track();window.addEventListener("vanta-analytics-ready",track);return()=>window.removeEventListener("vanta-analytics-ready",track);},[cart]);
  const subtotal=cart.reduce((sum,item)=>sum+item.priceKobo*item.quantity,0);
  const delivery=shippingQuote(settings??{},state);
  const total=delivery.feeKobo===null?null:subtotal+delivery.feeKobo-(promotion?.discountKobo||0);
  async function applyCode(){setQuoting(true);setError("");setPromotion(null);try{const r=await fetch(apiUrl("/api/promotions/quote"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,cart:cart.map(({variantId,quantity})=>({variantId,quantity}))})});const data=await r.json() as {code:string;discountKobo:number;error?:string};if(!r.ok)throw new Error(data.error||"This code could not be applied.");setPromotion(data);}catch(e){setError(e instanceof Error?e.message:"Please try again.");}finally{setQuoting(false);}}
  async function pay(event:FormEvent<HTMLFormElement>){event.preventDefault();if(submitting.current||!settings?.checkoutReady||total===null||!cart.length)return;submitting.current=true;setBusy(true);setError("");
    const fields=Object.fromEntries(new FormData(event.currentTarget));
    try{const response=await fetch(apiUrl("/api/checkout"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({expectedTotalKobo:total,promotionCode:promotion?.code||"",customer:fields,cart:cart.map(({variantId,quantity})=>({variantId,quantity}))}),signal:AbortSignal.timeout(30000)});
      const payload=await response.json() as {authorizationUrl?:string;error?:string};if(!response.ok)throw new Error(payload.error||"Payment could not start. Please try again.");
      const target=new URL(payload.authorizationUrl||"");if(target.protocol!=="https:"||target.hostname!=="checkout.paystack.com")throw new Error("The payment link could not be verified. Please contact customer care.");
      window.location.assign(target.href);
    }catch(e){setError(e instanceof Error&&e.name!=="TimeoutError"?e.message:"The payment service took too long. Please check your order with customer care before trying again.");submitting.current=false;setBusy(false);}
  }
  return <StoreShell><a className="dn-back" href="/?bag=1"><ArrowLeft size={16}/>Back to your bag</a><div className="dn-page-intro"><span className="dn-eyebrow">YOUR NEXT EVERYDAY UNIFORM</span><h1>Make it yours.</h1><p>Guest checkout. All prices in Nigerian naira.</p></div>
    {loading?<div className="dn-panel" role="status">Loading your bag and delivery options…</div>:!settings?<div className="dn-panel"><p role="alert">{error}</p><button className="dn-primary" onClick={()=>setRetry(n=>n+1)}>Try again</button></div>:!cart.length?<div className="dn-empty"><ShoppingBag size={38}/><h2>Your bag is empty.</h2><p>Choose a piece and a size to get started.</p><a className="dn-primary" href="/#collection">Explore the collection <ArrowRight size={16}/></a></div>:<>
      {!settings.checkoutReady&&<div className="dn-notice" role="status"><strong>Online orders are not open yet.</strong><p>You can review your bag and explore delivery options. Payments will open when the store is ready. <a href="/contact">Contact customer care</a></p></div>}
      {notice&&<p className="dn-notice" role="status">{notice}</p>}
      <form className="dn-checkout-grid dn-form" onSubmit={pay}><div><section className="dn-panel"><h2>01 / Your details</h2><p>Your order updates go to this email.</p><div className="dn-field-grid">
        <label className="dn-full">Email address<input name="email" type="email" autoComplete="email" required maxLength={200}/></label>
        <label>First name<input name="firstName" autoComplete="given-name" required minLength={2} maxLength={80}/></label><label>Last name<input name="lastName" autoComplete="family-name" required minLength={2} maxLength={80}/></label>
        <label className="dn-full">Phone number<input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={30}/></label>
      </div></section><section className="dn-panel"><h2>02 / Delivery address</h2><p>Delivery within Nigeria. Select your state for the exact fee.</p><div className="dn-field-grid">
        <label className="dn-full">Street address<input name="addressLine1" autoComplete="address-line1" required minLength={5} maxLength={240}/></label><label className="dn-full">Apartment, suite or landmark (optional)<input name="addressLine2" autoComplete="address-line2" maxLength={240}/></label>
        <label>City<input name="city" autoComplete="address-level2" required minLength={2} maxLength={100}/></label><label>State<select name="state" autoComplete="address-level1" required value={state} onChange={e=>setState(e.target.value)}><option value="">Choose your state</option>{NIGERIA_STATES.map(s=><option key={s}>{s}</option>)}</select></label>
        <label className="dn-full">Country<input value="Nigeria" readOnly autoComplete="country-name"/></label>
      </div>{settings.dispatchNote&&<p className="dn-delivery-note">Dispatch: {settings.dispatchNote}</p>}{state&&<p className="dn-delivery-note" role="status">{!delivery.supported?"Online delivery is not available to this state. Contact customer care for help.":delivery.feeKobo===null?"Delivery pricing has not been published yet.":delivery.estimate||"Contact customer care for an estimate."}</p>}</section></div>
      <aside className="dn-panel dn-order-summary"><h2>Your order</h2>{cart.map(item=><div className="dn-summary-item" key={item.variantId}><StoreImage src={item.imageUrl} alt={`${item.name} in ${item.color}`} sizes="76px"/><div><strong>{item.name.replace(/^\d+\s+/,"")}</strong><p>{item.color} · {item.size} · Qty {item.quantity}</p><span>{formatNaira(item.priceKobo*item.quantity)}</span></div></div>)}
        <a className="dn-text-link" href="/?bag=1">Edit your bag</a><label>Promotion code<input maxLength={32} value={code} onChange={e=>{setCode(e.target.value.toUpperCase());setPromotion(null);}}/></label><button type="button" className="dn-text-link" disabled={busy||quoting||!code.trim()} onClick={()=>void applyCode()}>{quoting?"Checking…":"Apply code"}</button>{promotion&&<p role="status">{promotion.code} applied · Save {formatNaira(promotion.discountKobo)}</p>}<dl className="dn-totals"><div><dt>Subtotal</dt><dd>{formatNaira(subtotal)}</dd></div>{promotion&&<div><dt>Discount</dt><dd>−{formatNaira(promotion.discountKobo)}</dd></div>}<div><dt>Delivery</dt><dd>{!state?"Select a state":delivery.feeKobo===null?"Unavailable":delivery.feeKobo===0?"Free":formatNaira(delivery.feeKobo)}</dd></div><div className="dn-total"><dt>Total</dt><dd>{state&&total!==null?formatNaira(total):"—"}</dd></div></dl>
        <label className="dn-checkbox"><input type="checkbox" required/>I have read the <a href="/terms-of-service" target="_blank" rel="noreferrer">terms</a> and <a href="/shipping-returns" target="_blank" rel="noreferrer">delivery & returns policy</a>.</label>
        {error&&<p className="dn-error" role="alert">{error}</p>}<button className="dn-primary dn-pay" disabled={busy||quoting||!settings.checkoutReady||!state||total===null}><LockKeyhole size={17}/>{busy?"Opening Paystack…":settings.checkoutReady?"Continue to Paystack":"Payments opening soon"}<ArrowRight size={17}/></button>
        <p className="dn-small">Pay securely with the methods available on Paystack. Your card details are entered on Paystack. <a href="/privacy-policy">Privacy policy</a></p>
      </aside></form></>}
  </StoreShell>;
}
