'use client';
import {useEffect,useState} from 'react';
import {apiUrl} from '@/lib/api-client';
import {formatNaira} from '@/lib/catalog';
import type {RewardQuote} from '@/lib/rewards';
export function RewardProgress({quote,bag=false}:{quote:RewardQuote|null;bag?:boolean}){
  const p=quote?.progress;if(!p)return null;
  const same=p.shippingRemainingKobo!==null&&p.shippingRemainingKobo===p.giftRemainingKobo&&p.giftAvailable;
  return <div className="dn-rewards" role="status" aria-live="polite"><strong>{p.title}</strong>
    {same?<p>{p.shippingRemainingKobo===0?'Free shipping and your free gift unlocked.':`Add ${formatNaira(p.shippingRemainingKobo!)} for free shipping and a free gift.`}</p>:<>
      {p.shippingRemainingKobo!==null&&<p>{p.shippingRemainingKobo===0?'Free shipping unlocked.':`Add ${formatNaira(p.shippingRemainingKobo)} for free shipping.`}</p>}
      {p.giftRemainingKobo!==null&&<p>{!p.giftAvailable?'The gift is currently out of stock.':p.giftRemainingKobo===0?'Your free gift is unlocked.':`Add ${formatNaira(p.giftRemainingKobo)} for a free gift.`}</p>}
    </>}
    {p.giftName&&p.giftAvailable&&<p>Gift: {p.giftName}</p>}
    <small>Based on item subtotal before discounts. {bag?'Shown for Nigeria; confirm your destination at checkout.':'Gift stock and eligibility are confirmed when you continue to payment.'}</small>
  </div>;
}
type Cart=Array<{variantId:string;quantity:number}>;
export function useRewardQuote({cart,countryCode='NG',state='',email='',code='',discountCode='',enabled=true,expectedSubtotalKobo}:{cart:Cart;countryCode?:string;state?:string;email?:string;code?:string;discountCode?:string;enabled?:boolean;expectedSubtotalKobo?:number}){
  const key=JSON.stringify({cart:cart.map(({variantId,quantity})=>({variantId,quantity})),countryCode,state,email:code?email.trim().toLowerCase():'',code,discountCode});
  const [result,setResult]=useState<{key:string;quote:RewardQuote|null;error:string}|null>(null),[retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!enabled||!cart.length)return;
    const controller=new AbortController();
    const timer=setTimeout(async()=>{const timeout=setTimeout(()=>{if(controller.signal.aborted)return;controller.abort();setResult({key,quote:null,error:'Checking rewards took too long. Please try again.'});},15000);try{
      const r=await fetch(apiUrl('/api/rewards/quote'),{method:'POST',headers:{'Content-Type':'application/json'},body:key,signal:controller.signal});
      const data=await r.json() as RewardQuote&{error?:string};if(!r.ok)throw new Error(data.error||'Rewards could not be checked.');
      if(!data||typeof data.signature!=='string'||!['subtotalKobo','discountKobo','shippingSavingsKobo'].every(k=>Number.isSafeInteger((data as any)[k])&&(data as any)[k]>=0)||!['baseShippingKobo','shippingKobo','totalKobo'].every(k=>(data as any)[k]===null||(Number.isSafeInteger((data as any)[k])&&(data as any)[k]>=0)))throw new Error('Your total could not be verified. Please try again.');
      if(!controller.signal.aborted)setResult({key,quote:data,error:''});
    }catch(e){if(!controller.signal.aborted)setResult({key,quote:null,error:e instanceof Error?e.message:'Rewards could not be checked.'});}finally{clearTimeout(timeout);}},300);
    return()=>{clearTimeout(timer);controller.abort();};
  },[key,enabled,retry]);
  const current=result?.key===key?result:null;
  return {quote:current?.quote||null,error:current?.error||(current?.quote&&expectedSubtotalKobo!==undefined&&current.quote.subtotalKobo!==expectedSubtotalKobo?'Item prices changed. Return to your bag and refresh before paying.':''),pending:enabled&&cart.length>0&&!current,refresh:()=>{setResult(null);setRetry(n=>n+1);}};
}
export function BagRewards({cart,open}:{cart:Cart;open:boolean}){
  const {quote}=useRewardQuote({cart,enabled:open});return <RewardProgress quote={quote} bag/>;
}
