"use client";
import {checkoutCustomerSchema,addressLookupSchema} from '@/lib/checkout-address';
import {CustomTransferPayment} from '@/components/custom-transfer-payment';
import type {TransferInstructions} from '@/lib/custom-transfer';
import {PaymentCompletion} from "@/components/payment-completion";
import {openPageBag} from "@/components/page-bag";
import {loadPaystack} from "@/lib/paystack-inline";
import {checkoutAttempt} from "@/lib/checkout-attempt";
import {RewardProgress,useRewardQuote} from "@/components/reward-progress";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole, ShoppingBag } from "lucide-react";
import { StoreShell } from "@/components/store-shell";
import StoreImage from "@/components/store-image";
import { apiUrl, type CheckoutSettings } from "@/lib/api-client";
import { CART_STORAGE_KEY, reconcileCart, restoreCart, type CartItem } from "@/lib/cart";
import { formatNaira, type CatalogProduct } from "@/lib/catalog-runtime";
import { shippingCountryName, postalCodeRequired, regionRequired } from "@/lib/shipping-countries";
import { NIGERIA_STATES, shippingQuote } from "@/lib/commerce-config";
import { readStorage, writeStorage } from "@/lib/browser-store";
import { trackCommerce } from "@/lib/analytics";
import { PaymentMethods } from "@/components/payment-methods";

export function CheckoutForm() {
  const [transfer,setTransfer]=useState<{instructions:TransferInstructions;token:string}|null>(null);
  useEffect(()=>{try{const saved=sessionStorage.getItem('vn-custom-transfer');if(saved)setTransfer(JSON.parse(saved));}catch{}},[]);
  const [paymentReference,setPaymentReference]=useState("");
  function showConfirmation(reference:string){try{sessionStorage.removeItem('vn-custom-transfer');}catch{}setTransfer(null);window.history.replaceState(null,"","/checkout/complete?reference="+encodeURIComponent(reference));setPaymentReference(reference);window.scrollTo({top:0,behavior:"instant"});}
  const [cart,setCart]=useState<CartItem[]>([]),[settings,setSettings]=useState<CheckoutSettings|null>(null);
  const [countryCode,setCountryCode]=useState("NG");
  const [state,setState]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[retry,setRetry]=useState(0);
  const [code,setCode]=useState(""),[promotion,setPromotion]=useState<{code:string;discountKobo:number}|null>(null),[quoting,setQuoting]=useState(false);
  const [email,setEmail]=useState(''),[rewardInput,setRewardInput]=useState(''),[rewardCode,setRewardCode]=useState('');
  const liveShipping=Boolean(settings?.shipbubbleCheckoutEnabled)&&(countryCode==='NG'||settings?.internationalCourierEnabled===true);
  const countries=settings?.shippingCountries||[['NG','Nigeria'],...(settings?.internationalEnabled?settings.internationalZones.map(z=>[z.countryCode,shippingCountryName(z.countryCode)]):[])];
  const [postalCode,setPostalCode]=useState(''),[postalNote,setPostalNote]=useState('');
  const autoPostal=useRef(false);
  const formRef=useRef<HTMLFormElement>(null);
  const [formCustomer,setFormCustomer]=useState<Record<string,string>>({countryCode:'NG'});
  const shippingCustomer:Record<string,string>={...formCustomer,countryCode,state,email,postalCode};
  const shippingReady=checkoutCustomerSchema.safeParse(shippingCustomer).success;
  type DeliveryOptions={quoteId:string;expiresAt:number;rates:Array<{rateId:string;provider:'shipbubble';carrier:string;amountKobo:number;delivery:string}>};
  const [deliveryOptions,setDeliveryOptions]=useState<{context:string;data:DeliveryOptions;rateId:string}|null>(null),[deliveryBusy,setDeliveryBusy]=useState(false),[deliveryError,setDeliveryError]=useState('');
  const [clock,setClock]=useState(Date.now());
  const shippingContext=JSON.stringify({customer:shippingCustomer,cart:cart.map(({variantId,quantity})=>({variantId,quantity})),rewardCode,promotionCode:promotion?.code||''});
  const activeDelivery=deliveryOptions?.context===shippingContext&&deliveryOptions.data.expiresAt>clock?deliveryOptions:null;
  const shippingSelection=activeDelivery?.rateId?{quoteId:activeDelivery.data.quoteId,rateId:activeDelivery.rateId,provider:'shipbubble' as const}:undefined;
  useEffect(()=>{if(!deliveryOptions)return;const t=setTimeout(()=>setClock(Date.now()),Math.max(0,deliveryOptions.data.expiresAt-Date.now())+10);return()=>clearTimeout(t);},[deliveryOptions]);
  const [deliveryRetry,setDeliveryRetry]=useState(0);
  const lookupContext=JSON.stringify(shippingCustomer);
  const lastLookup=useRef('');
  useEffect(()=>{
    if(!liveShipping||(!(!postalCode||!shippingCustomer.city||(regionRequired(countryCode)&&!state)))||!addressLookupSchema.safeParse(shippingCustomer).success||(countryCode==='NG'&&!state)||lastLookup.current===lookupContext)return;
    const controller=new AbortController();
    const timer=setTimeout(async()=>{lastLookup.current=lookupContext;try{
      const response=await fetch(apiUrl('/api/shipping/address'),{method:'POST',headers:{'Content-Type':'application/json'},body:lookupContext,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
      const found=await response.json() as {postalCode?:string;city?:string;state?:string};if(controller.signal.aborted)return;
      if(!response.ok)throw Error();
      if(!postalCode&&found.postalCode){autoPostal.current=true;setPostalCode(found.postalCode);}
      if(!state&&countryCode!=='NG'&&found.state)setState(found.state);
      if(!shippingCustomer.city&&found.city&&formRef.current){const field=formRef.current.elements.namedItem('city') as HTMLInputElement;field.value=found.city;setFormCustomer(current=>({...current,city:found.city!}));}
      setPostalNote('Address details checked. Please review any completed fields.');
    }catch{if(!controller.signal.aborted)setPostalNote('Enter any missing address details manually. Nigerian postcodes can be left blank.');}},1100);
    return()=>{clearTimeout(timer);controller.abort();};
  },[lookupContext,liveShipping]);

  useEffect(()=>{
    if(!liveShipping||!shippingReady||!cart.length||activeDelivery)return;
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      setDeliveryBusy(true);setDeliveryError('');
      try{
        const response=await fetch(apiUrl('/api/shipping/quotes'),{method:'POST',headers:{'Content-Type':'application/json'},body:shippingContext,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(45000)])});
        const data=await response.json() as DeliveryOptions&{error?:string};
        if(!response.ok)throw Error(data.error||'Delivery could not be checked.');
        if(!data.rates?.length||data.rates.some(v=>v.provider!=='shipbubble'||!Number.isSafeInteger(v.amountKobo)||v.amountKobo<0))throw Error('Delivery rates could not be verified.');
        data.rates.sort((a,b)=>a.amountKobo-b.amountKobo);
        if(!controller.signal.aborted){setClock(Date.now());setDeliveryOptions({context:shippingContext,data,rateId:data.rates[0].rateId});}
      }catch(e){if(!controller.signal.aborted)setDeliveryError(e instanceof Error?e.message:'Delivery could not be checked.');}
      finally{if(!controller.signal.aborted)setDeliveryBusy(false);}
    },900);
    return()=>{clearTimeout(timer);controller.abort();setDeliveryBusy(false);};
  },[shippingContext,liveShipping,shippingReady,deliveryRetry,clock,deliveryOptions]);
  const rewards=useRewardQuote({shippingSelection,shippingCustomer:shippingSelection?shippingCustomer:undefined,cart,countryCode,state,email,code:rewardCode,discountCode:promotion?.code||'',enabled:!loading&&Boolean(settings),expectedSubtotalKobo:cart.reduce((sum,i)=>sum+i.priceKobo*i.quantity,0)});
  const promotionRequest=useRef(0);
  const submitting=useRef(false), tracked=useRef(false);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setError("");
    fetch(apiUrl("/api/catalog"),{cache:"no-store",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])}).then(async r=>{if(!r.ok)throw new Error("The store could not load. Please try again.");return r.json() as Promise<{products:CatalogProduct[];checkout:CheckoutSettings}>;}).then(data=>{
      if(controller.signal.aborted)return;
      if(!Array.isArray(data?.products)||!data.checkout||!Array.isArray(data.checkout.internationalZones))throw new Error("The store returned incomplete details. Please try again.");
      let old:CartItem[]=[];try{old=restoreCart(JSON.parse(readStorage(CART_STORAGE_KEY)||"[]"));}catch{/* Empty damaged storage. */}
      const next=reconcileCart(old,data.products);if(JSON.stringify(old)!==JSON.stringify(next))setNotice("Your bag was updated to the latest prices and available stock. Please review it before paying.");
      setPromotion(null);setCart(next);setSettings(data.checkout);writeStorage(CART_STORAGE_KEY,JSON.stringify(next));
    }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Please try again.");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[retry]);
  useEffect(()=>{const track=()=>{if(!tracked.current&&cart.length&&readStorage("vanta-noir-analytics-consent")==="granted"&&(window as Window&{gtag?:unknown}).gtag){trackCommerce("begin_checkout",cart);tracked.current=true;}};track();window.addEventListener("vanta-analytics-ready",track);return()=>window.removeEventListener("vanta-analytics-ready",track);},[cart]);
  useEffect(()=>{const sync=()=>{try{const next=restoreCart(JSON.parse(readStorage(CART_STORAGE_KEY)||"[]"));setCart(current=>JSON.stringify(current)===JSON.stringify(next)?current:next);}catch{}};window.addEventListener('vn-storage-changed',sync);window.addEventListener('storage',sync);return()=>{window.removeEventListener('vn-storage-changed',sync);window.removeEventListener('storage',sync);};},[]);
  const subtotal=cart.reduce((sum,item)=>sum+item.priceKobo*item.quantity,0);
  const delivery=shippingQuote(settings??{},state,countryCode);
  const total=liveShipping&&!shippingSelection?null:rewards.quote?.totalKobo??null;
  const deliveryFee=liveShipping?(shippingSelection?rewards.quote?.shippingKobo??null:null):rewards.quote?.shippingKobo??delivery.feeKobo;
  async function applyCode(){const request=++promotionRequest.current;setQuoting(true);setError("");setPromotion(null);try{const r=await fetch(apiUrl("/api/promotions/quote"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,cart:cart.map(({variantId,quantity})=>({variantId,quantity}))}),signal:AbortSignal.timeout(15000)});const data=await r.json().catch(()=>{throw new Error("The promotion service returned an unreadable response. Please try again.");}) as {code:string;discountKobo:number;error?:string};if(!r.ok)throw new Error(data.error||"This code could not be applied.");if(typeof data.code!=="string"||!Number.isSafeInteger(data.discountKobo)||data.discountKobo<0)throw new Error("The promotion could not be verified. Please try again.");if(request===promotionRequest.current)setPromotion(data);}catch(e){if(request===promotionRequest.current)setError(e instanceof Error&&e.name!=="TimeoutError"?e.message:"Checking the promotion took too long. Please try again.");}finally{if(request===promotionRequest.current)setQuoting(false);}}
  async function pay(event:FormEvent<HTMLFormElement>){event.preventDefault();if(submitting.current||!settings?.checkoutReady||total===null||!cart.length||rewards.pending||rewards.error||!rewards.quote)return;submitting.current=true;setBusy(true);setError("");
    const fields=Object.fromEntries(new FormData(event.currentTarget));
    try{const checkoutData={shippingSelection:liveShipping?shippingSelection:undefined,expectedTotalKobo:total,rewardCode,expectedRewardSignature:rewards.quote.signature,promotionCode:promotion?.code||"",customer:fields,cart:cart.map(({variantId,quantity})=>({variantId,quantity}))};const attempt=await checkoutAttempt(checkoutData);const response=await fetch(apiUrl("/api/checkout"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...checkoutData,paymentChannel:settings.customTransferEnabled?'bank_transfer':'hosted',checkoutAttempt:attempt}),signal:AbortSignal.timeout(30000)});
      const payload=await response.json() as {transfer?:TransferInstructions;authorizationUrl?:string;accessCode?:string;reference?:string;receiptToken?:string;complete?:boolean;checking?:boolean;expired?:boolean;error?:string};if(!response.ok)throw new Error(payload.error||"Payment could not start. Please try again.");
      if(payload.reference&&payload.receiptToken){try{sessionStorage.setItem(`vn-receipt:${payload.reference}`,payload.receiptToken);}catch{/* Storage restrictions must not block the verified payment redirect. */}}
      if(payload.reference){
        const key=`vanta-noir-cleared-${payload.reference}`;
        if(!readStorage(key)){const current=restoreCart(JSON.parse(readStorage(CART_STORAGE_KEY)||'[]'));const remaining=current.flatMap(i=>{const n=i.quantity-(cart.find(c=>c.variantId===i.variantId)?.quantity||0);return n>0?[{...i,quantity:n}]:[];});writeStorage(CART_STORAGE_KEY,JSON.stringify(remaining));writeStorage(key,'1');}
        try{const old=JSON.parse(localStorage.getItem('vn-order-updates')||'[]');localStorage.setItem('vn-order-updates',JSON.stringify([{reference:payload.reference},...old.filter((o:{reference:string})=>o.reference!==payload.reference)].slice(0,50)));}catch{}
      }
      if(payload.transfer&&payload.receiptToken){const value={instructions:payload.transfer,token:payload.receiptToken};setTransfer(value);try{sessionStorage.setItem('vn-custom-transfer',JSON.stringify(value));}catch{}setBusy(false);submitting.current=false;return;}
      if(payload.complete||payload.checking||payload.expired){if(!payload.reference)throw new Error("The payment response is incomplete. Please contact customer care before retrying.");showConfirmation(payload.reference!);return;}
      const target=new URL(payload.authorizationUrl||"");if(target.protocol!=="https:"||target.hostname!=="checkout.paystack.com")throw new Error("The payment link could not be verified. Please contact customer care.");
      if(!payload.accessCode) throw new Error("The secure payment window is not ready. Please retry this order; your bag is saved.");
      if(!payload.reference) throw new Error("The payment reference is missing. Please contact customer care.");
      const Paystack = await loadPaystack();
      new Paystack().resumeTransaction(payload.accessCode, {
        onSuccess: () => { showConfirmation(payload.reference!); },
        onCancel: () => { submitting.current=false;setBusy(false);showConfirmation(payload.reference!); },
        onError: () => { submitting.current=false;setBusy(false);setError("Payment could not be completed. Please retry the same order or contact customer care."); }
      });
    }catch(e){setError(e instanceof Error&&e.name!=="TimeoutError"?e.message:"The payment service took too long. Please check your order with customer care before trying again.");submitting.current=false;setBusy(false);}
  }
  if(transfer)return <StoreShell checkout><CustomTransferPayment transfer={transfer.instructions} receiptToken={transfer.token} onPaid={()=>showConfirmation(transfer.instructions.reference)}/></StoreShell>;
  if(paymentReference)return <PaymentCompletion reference={paymentReference}/>;
  return <StoreShell checkout><button type="button" className="dn-back" onClick={openPageBag}><ArrowLeft size={16}/>Back to your bag</button><div className="dn-page-intro"><span className="dn-eyebrow">PRESENCE. POWER. PRECISION.</span><h1>Checkout.</h1><p>Make it yours. Guest checkout in Nigerian naira.</p></div>
    {loading?<div className="dn-panel" role="status">Loading your bag and delivery options…</div>:!settings?<div className="dn-panel"><p role="alert">{error}</p><button className="dn-primary" onClick={()=>setRetry(n=>n+1)}>Try again</button></div>:!cart.length?<div className="dn-empty"><ShoppingBag size={38}/><h2>Your bag is empty.</h2><p>Choose a piece and a size to get started.</p><a className="dn-primary" href="/#collection">Explore the collection <ArrowRight size={16}/></a></div>:<>
      {!settings.checkoutReady&&<div className="dn-notice" role="status"><strong>Online orders are not open yet.</strong><p>You can review your bag and explore delivery options. Payments will open when the store is ready. <a href="/contact">Contact customer care</a></p></div>}
      {notice&&<p className="dn-notice" role="status">{notice}</p>}
      <form ref={formRef} className="dn-checkout-grid dn-form" onChange={e=>{if(formRef.current)setFormCustomer(Object.fromEntries(new FormData(formRef.current)) as Record<string,string>);if(autoPostal.current&&['addressLine1','addressLine2','city','state','countryCode'].includes((e.target as unknown as HTMLInputElement).name)){autoPostal.current=false;setPostalCode('');setPostalNote('');}}} onSubmit={pay}><div><section className="dn-panel"><h2>01 / Your details</h2><p>Your order updates go to this email.</p><div className="dn-field-grid">
        <label className="dn-full">Email address<input name="email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={200}/></label>
        <label>First name<input name="firstName" autoComplete="given-name" required minLength={2} maxLength={80}/></label><label>Last name<input name="lastName" autoComplete="family-name" required minLength={2} maxLength={80}/></label>
        <label className="dn-full">Phone number<input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={30}/></label>
      </div></section><section className="dn-panel"><h2>02 / Delivery address</h2><p>{settings.internationalEnabled?"Enter your address. The cheapest available courier is selected automatically. All charges are in Nigerian naira.":liveShipping?"Complete your address and state. We automatically select the cheapest available courier.":"Delivery within Nigeria. Select your state for the delivery fee."}</p><div className="dn-field-grid">
        <label className="dn-full">Street address<input name="addressLine1" autoComplete="address-line1" required minLength={5} maxLength={240}/></label><label className="dn-full">Apartment, suite or landmark (optional)<input name="addressLine2" autoComplete="address-line2" maxLength={240}/></label>
        <label>City<input name="city" autoComplete="address-level2" required minLength={2} maxLength={100}/></label>{countryCode==="NG"?<label>State<select name="state" autoComplete="address-level1" required value={state} onChange={e=>setState(e.target.value)}><option value="">Choose your state</option>{NIGERIA_STATES.map(s=><option key={s}>{s}</option>)}</select></label>:<label>State / province / region{regionRequired(countryCode)?"":" (if applicable)"}<input required={regionRequired(countryCode)} name="state" autoComplete="address-level1" maxLength={100} value={state} onChange={e=>setState(e.target.value)}/></label>}
        <label className="dn-full">Country{countries.length>1?<select name="countryCode" autoComplete="country" value={countryCode} onChange={e=>{setCountryCode(e.target.value);setState("");setPostalCode("");setPostalNote("");}}>{countries.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select>:<><input value="Nigeria" readOnly autoComplete="country-name"/><input type="hidden" name="countryCode" value="NG"/></>}</label>{<label className="dn-full">Postal / ZIP code{!postalCodeRequired(countryCode)&&" (optional)"}<input name="postalCode" autoComplete="postal-code" value={postalCode} onChange={e=>{autoPostal.current=false;setPostalCode(e.target.value);}} required={postalCodeRequired(countryCode)} maxLength={32}/></label>}
      </div>{postalNote&&<p className="dn-small" role="status">{postalNote}</p>}{settings.acceptingOrders&&<p className="dn-delivery-note">{settings.processingNote}</p>}{settings.dispatchNote&&<p className="dn-delivery-note">Dispatch: {settings.dispatchNote}</p>}{!liveShipping&&(state||countryCode!=="NG")&&<p className="dn-delivery-note" role="status">{!delivery.supported?"Online delivery is not available to this destination. Contact customer care for help.":delivery.feeKobo===null?"Delivery pricing has not been published yet.":delivery.estimate||"Contact customer care for an estimate."}</p>}{countryCode!=="NG"&&(settings.internationalEnabled||settings.internationalCourierEnabled)&&<p className="dn-delivery-note"><strong>Customs &amp; import charges:</strong> {settings.internationalDutiesNote}</p>}</section>{liveShipping&&<div className="dn-delivery-note" aria-live="polite">{deliveryBusy?'Calculating shipping…':activeDelivery?<>Shipping · {formatNaira(activeDelivery.data.rates[0].amountKobo)}<br/>{activeDelivery.data.rates[0].delivery}<br/>Delivery is calculated automatically.</>:!shippingReady?'Complete your delivery address and state to calculate shipping.':null}{deliveryError&&<p role="alert" className="dn-error">{deliveryError} <button type="button" onClick={()=>setDeliveryRetry(n=>n+1)}>Retry shipping</button></p>}</div>}</div>
      <aside className="dn-panel dn-order-summary"><h2>Your order</h2>{cart.map(item=><div className="dn-summary-item" key={item.variantId}><StoreImage src={item.imageUrl} alt={`${item.name} in ${item.color}`} sizes="76px"/><div><strong>{item.name.replace(/^\d+\s+/,"")}</strong><p>{item.color} · {item.size} · Qty {item.quantity}</p><span>{formatNaira(item.priceKobo*item.quantity)}</span></div></div>)}
        <button type="button" className="dn-text-link" onClick={openPageBag}>Edit your bag</button><label>Promotion code<input maxLength={32} value={code} onChange={e=>{promotionRequest.current++;setQuoting(false);setCode(e.target.value.toUpperCase());setPromotion(null);}}/></label><button type="button" className="dn-text-link" disabled={busy||quoting||!code.trim()} onClick={()=>void applyCode()}>{quoting?"Checking…":"Apply code"}</button>{promotion&&<p role="status">{promotion.code} applied · Save {formatNaira(promotion.discountKobo)}</p>}<label>Delivery / reward code (optional)<input maxLength={48} value={rewardInput} onChange={e=>{setRewardInput(e.target.value.toUpperCase());setRewardCode('');}}/></label><button type="button" className="dn-text-link" disabled={busy||!rewardInput.trim()} onClick={()=>{setRewardCode(rewardInput.trim().toUpperCase());rewards.refresh();}}>Apply delivery / reward code</button>{rewardCode&&<button type="button" className="dn-text-link" disabled={busy} onClick={()=>{setRewardCode('');setRewardInput('');}}>Remove reward code</button>}
        <RewardProgress quote={rewards.quote}/>{rewards.pending&&<p role="status">Checking rewards and your total…</p>}{rewards.error&&<p role="alert" className="dn-error">{rewards.error} <button type="button" onClick={rewards.refresh}>Try again</button></p>}
        {rewards.quote?.gift&&<div className="dn-summary-item"><div><strong>Free gift · {rewards.quote.gift.productName}</strong><p>{rewards.quote.gift.color} · {rewards.quote.gift.size} · Qty 1</p><span>Free</span></div></div>}
        <dl className="dn-totals"><div><dt>Subtotal</dt><dd>{formatNaira(rewards.quote?.subtotalKobo??subtotal)}</dd></div>{promotion&&<div><dt>Discount</dt><dd>−{formatNaira(rewards.quote?.discountKobo??promotion.discountKobo)}</dd></div>}<div><dt>Shipping</dt><dd>{!shippingReady?"Complete delivery address":deliveryFee===null?(liveShipping?"Calculating…":"Unavailable"):deliveryFee===0?"Free":formatNaira(deliveryFee)}</dd></div><div className="dn-total"><dt>Total</dt><dd>{(state||countryCode!=="NG")&&total!==null?formatNaira(total):"—"}</dd></div></dl>
        <label className="dn-checkbox"><input type="checkbox" required/>I have read the <a href="/terms-of-service" target="_blank" rel="noreferrer">terms</a> and <a href="/shipping-returns" target="_blank" rel="noreferrer">delivery & returns policy</a>.</label>
        {error&&<p className="dn-error" role="alert">{error}</p>}<button className="dn-primary dn-pay" disabled={busy||quoting||rewards.pending||Boolean(rewards.error)||!rewards.quote||!settings.checkoutReady||!shippingReady||deliveryBusy||total===null}><LockKeyhole size={17}/>{busy?"Preparing payment…":settings.checkoutReady?"Continue to payment":"Payments opening soon"}<ArrowRight size={17}/></button>
        {!settings.customTransferEnabled&&<PaymentMethods/>}
        {settings.customTransferEnabled?<p className="dn-small">Pay by bank transfer through your Vanta Noir checkout. Confirmation and your receipt appear here after verification. Card payments are not available in this custom checkout.</p>:<p className="dn-small">Payment opens in a secure Paystack window over this page. Your bank may require a separate verification step. Review any provider fee before authorising payment. We confirm your payment here and provide your Vanta Noir receipt. Your card details go directly to Paystack. <a href="/privacy-policy">Privacy policy</a></p>}
      </aside></form></>}
  </StoreShell>;
}
