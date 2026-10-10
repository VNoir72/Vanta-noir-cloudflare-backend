import {addressLookupSchema} from './checkout-address';
import {getDbBinding,runtimeEnv} from './runtime-env';
import {providerJson} from './shipping-comparison';
import {shippingCountryName} from './shipping-countries';
export async function validatedShippingAddress(raw:unknown){
 const c=addressLookupSchema.parse(raw),key=runtimeEnv().SHIPBUBBLE_API_KEY||'';
 if(!key.startsWith('sb_prod_'))throw Error('Address lookup unavailable.');
 const cacheKey=async(postal:string)=>'shipping-address-v2:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({...c,postalCode:postal})))),b=>b.toString(16).padStart(2,'0')).join('');
 const db=getDbBinding(),cache=await cacheKey(c.postalCode);
 const stored=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(cache).first<{value:string}>();
 if(stored){const entry=JSON.parse(stored.value);if(entry.expiresAt>Date.now())return entry.data as {address_code:number;postalCode:string;city:string;state:string};}
 const data=await providerJson('https://api.shipbubble.com/v1/shipping/address/validate',key,{name:c.firstName+' '+c.lastName,email:c.email,phone:c.phone,address:[c.addressLine1,c.addressLine2,c.city,c.state,c.postalCode,shippingCountryName(c.countryCode)].filter(Boolean).join(', ')}) as {address_code?:number;country_code?:string;postal_code?:string;city?:string;state?:string};
 if(!Number.isSafeInteger(data?.address_code)||data.country_code&&data.country_code!==c.countryCode)throw Error('The courier could not verify this destination.');
 // Only display a postcode when the provider explicitly confirms the country.
 const postalCode=data.country_code===c.countryCode&&typeof data.postal_code==='string'&&(c.countryCode==='NG'?/^\d{6}$/:/^[\p{L}\p{N} -]{1,32}$/u).test(data.postal_code)?data.postal_code:'';
 const part=(value:unknown)=>data.country_code===c.countryCode&&typeof value==='string'?value.trim().slice(0,100):'';
 const result={address_code:data.address_code!,postalCode,city:part(data.city),state:part(data.state)};
 const value=JSON.stringify({data:result,expiresAt:Date.now()+86400000});
 const keys=new Set([cache,...(!c.postalCode&&postalCode?[await cacheKey(postalCode)]:[])]);
 await db.batch([...keys].map(k=>db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k,value)));
 await db.prepare("DELETE FROM store_meta WHERE key LIKE 'shipping-address-v2:%' AND json_extract(value,'$.expiresAt')<?").bind(Date.now()).run();
 return result;
}
