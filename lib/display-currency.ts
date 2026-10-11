'use client';
import {useEffect,useState} from 'react';
import {formatNaira} from './catalog-runtime';
type Rates={values:Record<string,number>;at:number};
const valid=(r:Rates|null):r is Rates=>Boolean(r&&Number.isFinite(r.at)&&r.at<=Date.now()+60000&&Date.now()-r.at<48*3600000);
export function useDisplayCurrency(){
 const [currency,setCurrency]=useState('NGN'),[rates,setRates]=useState<Rates|null>(null),[error,setError]=useState(false);
 useEffect(()=>{try{const v=localStorage.getItem('vn-currency');if(v&&/^[A-Z]{3}$/.test(v))setCurrency(v)}catch{}},[]);
 useEffect(()=>{let active=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);let cached:Rates|null=null;try{cached=JSON.parse(localStorage.getItem('vn-fx-all')||'null')}catch{};
 if(valid(cached)){setRates(cached);clearTimeout(timer);return;}
 fetch('https://open.er-api.com/v6/latest/NGN',{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();const d=await r.json() as {rates?:Record<string,number>;time_last_update_unix?:number;result?:string;base_code?:string};const values=Object.fromEntries(Object.entries(d.rates||{}).filter(([key,value])=>/^[A-Z]{3}$/.test(key)&&typeof value==='number'&&Number.isFinite(value)&&value>0)) as Record<string,number>;const next={values,at:Number(d.time_last_update_unix)*1000};if(d.result!=='success'||d.base_code!=='NGN'||!valid(next))throw Error();if(active){setRates(next);setError(false);try{localStorage.setItem('vn-fx-all',JSON.stringify(next))}catch{}}}).catch(()=>{if(active)setError(true)}).finally(()=>clearTimeout(timer));return()=>{active=false;clearTimeout(timer);controller.abort()};
 },[]);
 const ready=valid(rates)&&!!rates.values[currency];
 return {currency,error,ready,currencies:Array.from(new Set(['NGN',currency,...Object.keys(rates?.values||{})])).sort(),choose:(v:string)=>{if(!/^[A-Z]{3}$/.test(v))return;setCurrency(v);try{localStorage.setItem('vn-currency',v)}catch{}},format:(kobo:number)=>currency!=='NGN'&&ready?'≈ '+new Intl.NumberFormat('en',{style:'currency',currency}).format(kobo/100*rates!.values[currency]):formatNaira(kobo)};
}
