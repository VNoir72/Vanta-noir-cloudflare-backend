'use client';
import {useEffect,useState} from 'react';
import {formatNaira} from './catalog-runtime';
type Rate={usd:number;at:number};
const valid=(r:Rate|null):r is Rate=>Boolean(r&&Number.isFinite(r.usd)&&r.usd>0&&Number.isFinite(r.at)&&r.at<=Date.now()+60000&&Date.now()-r.at<48*3600000);
export function useDisplayCurrency(){
 const [currency,setCurrency]=useState('NGN'),[rate,setRate]=useState<Rate|null>(null),[error,setError]=useState(false);
 useEffect(()=>{try{setCurrency(localStorage.getItem('vn-currency')==='USD'?'USD':'NGN')}catch{}},[]);
 useEffect(()=>{if(currency!=='USD')return;let active=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);let cached:Rate|null=null;try{cached=JSON.parse(localStorage.getItem('vn-fx')||'null')}catch{};
 if(valid(cached)){setRate(cached);clearTimeout(timer);return;}
 fetch('https://open.er-api.com/v6/latest/NGN',{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();const d=await r.json() as {rates?:{USD?:number};time_last_update_unix?:number;result?:string;base_code?:string};const next={usd:Number(d.rates?.USD),at:Number(d.time_last_update_unix)*1000};if(d.result!=='success'||d.base_code!=='NGN'||!valid(next))throw Error();if(active){setRate(next);setError(false);try{localStorage.setItem('vn-fx',JSON.stringify(next))}catch{}}}).catch(()=>{if(active){setError(true);setRate(null)}}).finally(()=>clearTimeout(timer));return()=>{active=false;clearTimeout(timer);controller.abort()};
 },[currency]);
 return {currency,error,ready:valid(rate),choose:(v:string)=>{setCurrency(v);try{localStorage.setItem('vn-currency',v)}catch{}},format:(kobo:number)=>currency==='USD'&&valid(rate)?'≈ '+new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(kobo/100*rate.usd):formatNaira(kobo)};
}
