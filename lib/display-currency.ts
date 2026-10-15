'use client';
import {useEffect,useState} from 'react';
import {apiUrl} from './api-client';
import countryCurrencies from '@/mobile/src/country-currencies.json';
import {formatNaira} from './catalog-runtime';
type Rates={values:Record<string,number>;at:number};
const valid=(r:Rates|null):r is Rates=>Boolean(r&&Number.isFinite(r.at)&&r.at<=Date.now()+60000&&Date.now()-r.at<48*3600000);
export function useDisplayCurrency(){
 const [retry,setRetry]=useState(0);
 const [currency,setCurrency]=useState('NGN'),[rates,setRates]=useState<Rates|null>(null),[error,setError]=useState(false);
 useEffect(()=>{try{const v=localStorage.getItem('vn-currency');if(v&&/^[A-Z]{3}$/.test(v))setCurrency(v)}catch{};const sync=()=>{try{const v=localStorage.getItem('vn-currency');if(v&&/^[A-Z]{3}$/.test(v))setCurrency(v);}catch{}};window.addEventListener('vn-currency-change',sync);window.addEventListener('storage',sync);return()=>{window.removeEventListener('vn-currency-change',sync);window.removeEventListener('storage',sync);};},[]);
 useEffect(()=>{let active=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);let cached:Rates|null=null;try{cached=JSON.parse(localStorage.getItem('vn-fx-all')||'null')}catch{};
 if(valid(cached)){setRates(cached);clearTimeout(timer);return;}
 fetch(apiUrl('/api/customer/currencies'),{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();const d=await r.json() as {rates?:Record<string,number>;time_last_update_unix?:number;result?:string;base_code?:string};const values=Object.fromEntries(Object.entries(d.rates||{}).filter(([key,value])=>/^[A-Z]{3}$/.test(key)&&typeof value==='number'&&Number.isFinite(value)&&value>0)) as Record<string,number>;const next={values,at:Number(d.time_last_update_unix)*1000};if(d.result!=='success'||d.base_code!=='NGN'||!valid(next))throw Error();if(active){setRates(next);setError(false);try{localStorage.setItem('vn-fx-all',JSON.stringify(next))}catch{}}}).catch(()=>{if(active)setError(true)}).finally(()=>clearTimeout(timer));return()=>{active=false;clearTimeout(timer);controller.abort()};
 },[retry]);
 const ready=valid(rates)&&!!rates.values[currency];
 return {currency,error,ready,reload:()=>setRetry(n=>n+1),chooseCountry:(country:string)=>{const value=(countryCurrencies as Record<string,string>)[country]||'NGN';setCurrency(value);try{localStorage.setItem('vn-country',country);localStorage.setItem('vn-currency',value);window.dispatchEvent(new Event('vn-currency-change'));}catch{}},currencies:Array.from(new Set(['NGN',currency,...Object.keys(rates?.values||{})])).sort(),choose:(v:string)=>{if(!/^[A-Z]{3}$/.test(v))return;setCurrency(v);try{localStorage.setItem('vn-currency',v);window.dispatchEvent(new Event('vn-currency-change'))}catch{}},format:(kobo:number)=>currency!=='NGN'&&ready?'≈ '+new Intl.NumberFormat('en',{style:'currency',currency}).format(kobo/100*rates!.values[currency]):currency==='NGN'?formatNaira(kobo):currency+' conversion unavailable'};
}
