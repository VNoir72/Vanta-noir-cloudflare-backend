import {getDbBinding} from './runtime-env';
type Rates={result:'success';base_code:'NGN';time_last_update_unix:number;rates:Record<string,number>};
export function validRates(v:unknown):v is Rates {const d=v as Rates;return !!d&&d.result==='success'&&d.base_code==='NGN'&&Number.isFinite(d.time_last_update_unix)&&d.time_last_update_unix*1000<=Date.now()+60000&&Date.now()-d.time_last_update_unix*1000<48*3600000&&d.rates?.NGN===1&&['USD','GBP','EUR'].every(k=>Number.isFinite(d.rates[k])&&d.rates[k]>0);}
export async function currencyRates(){
 const db=getDbBinding(),key='public-currency-rates:NGN';
 const cached=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();
 const previous=cached?JSON.parse(cached.value):null;
 if(validRates(previous))return Response.json(previous,{headers:{'Cache-Control':'public, max-age=300'}});
 try{
  const response=await fetch('https://open.er-api.com/v6/latest/NGN',{signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Rates unavailable');
  const reader=response.body?.getReader();if(!reader)throw Error('Empty rates');let total=0,text='';const decoder=new TextDecoder();
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>65536){await reader.cancel();throw Error('Rates response too large');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
  const d=JSON.parse(text) as Rates;
  const rates=Object.fromEntries(Object.entries(d.rates||{}).filter(([key,value])=>/^[A-Z]{3}$/.test(key)&&typeof value==='number'&&Number.isFinite(value)&&value>0));
  const next={result:'success' as const,base_code:'NGN' as const,time_last_update_unix:d.time_last_update_unix,rates};
  if(!validRates(d)||!validRates(next))throw Error('Invalid rates');
  await db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(next)).run();
  return Response.json(next,{headers:{'Cache-Control':'public, max-age=300'}});
 }catch{return Response.json({error:'Exchange rates are temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
