import {cachedShipbubbleAddress} from './shipbubble-address-cache';
import {addressLookupSchema} from './checkout-address';
import {getDbBinding,runtimeEnv} from './runtime-env';
import {providerJson} from './shipping-comparison';
import {shippingCountryName} from './shipping-countries';
export async function validatedShippingAddress(raw:unknown){
 const c=addressLookupSchema.parse(raw),key=runtimeEnv().SHIPBUBBLE_API_KEY||'';
 if(!key.startsWith('sb_prod_'))throw Error('Address lookup unavailable.');
 const cacheKey=async(postal:string,city=c.city,state=c.state)=>'shipping-address-v2:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([key,{...c,city,state,postalCode:postal}])))),b=>b.toString(16).padStart(2,'0')).join('');
 const db=getDbBinding(),cache=await cacheKey(c.postalCode);
 const stored=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(cache).first<{value:string}>();
 if(stored){const entry=JSON.parse(stored.value);if(Number.isSafeInteger(entry.data?.address_code)&&entry.data.address_code>0)return entry.data as {address_code:number;postalCode:string;city:string;state:string};}
 const address={name:c.firstName+' '+c.lastName,email:c.email,phone:c.phone,address:[c.addressLine1,c.addressLine2,c.city,c.state,c.postalCode,shippingCountryName(c.countryCode)].filter(Boolean).join(', ')};
 const data=await cachedShipbubbleAddress(key,address,()=>providerJson('https://api.shipbubble.com/v1/shipping/address/validate',key,address)) as {address_code?:number;country_code?:string;postal_code?:string;city?:string;state?:string};
 if(!Number.isSafeInteger(data?.address_code)||data.country_code&&data.country_code!==c.countryCode)throw Error('The courier could not verify this destination.');
 // Only display a postcode when the provider explicitly confirms the country.
 const postalCode=data.country_code===c.countryCode&&typeof data.postal_code==='string'&&(c.countryCode==='NG'?/^\d{6}$/:/^[\p{L}\p{N} -]{1,32}$/u).test(data.postal_code)?data.postal_code:'';
 const part=(value:unknown)=>data.country_code===c.countryCode&&typeof value==='string'?value.trim().slice(0,100):'';
 const result={address_code:data.address_code!,postalCode,city:part(data.city),state:part(data.state)};
 const value=JSON.stringify({data:result,validatedAt:Date.now()});
 // The app can save provider-confirmed city/state/postcode after lookup. These
 // are aliases of the same validation, not new paid address requests. Keep the
 // street and recipient unchanged, and only accept country-confirmed fields.
 const keys=new Set([cache]);
 for(const postal of new Set([c.postalCode,...(postalCode?[postalCode]:[])]))
  for(const city of new Set([c.city,...(result.city?[result.city]:[])]))
   for(const state of new Set([c.state,...(result.state?[result.state]:[])]))keys.add(await cacheKey(postal,city,state));
 await db.batch([...keys].map(k=>db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k,value)));
 return result;
}
