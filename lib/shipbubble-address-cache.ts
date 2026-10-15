import {getDbBinding} from './runtime-env';

type AddressRequest={name:string;email:string;phone:string;address:string};
export type ValidatedAddress={address_code:number;country_code?:string;postal_code?:string;city?:string;state?:string};
/** Account-scoped, exact-recipient reuse. Never stores raw contact details or keys. */
export async function cachedShipbubbleAddress(key:string,input:AddressRequest,validate:()=>Promise<unknown>):Promise<ValidatedAddress>{
 const normalized=Object.fromEntries(Object.entries(input).map(([k,v])=>[k,v.trim().replace(/\s+/g,' ')]));
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([key,normalized])))),b=>b.toString(16).padStart(2,'0')).join('');
 const db=getDbBinding(),cacheKey='shipbubble-address:'+hash;
 const row=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(cacheKey).first<{value:string}>();
 if(row){try{const saved=JSON.parse(row.value);if(saved.expiresAt>Date.now()&&Number.isSafeInteger(saved.data?.address_code)&&saved.data.address_code>0)return saved.data;}catch{/* Revalidate malformed cache entries. */}}
 const raw=await validate();
 if(!raw||typeof raw!=='object')throw Error('Shipbubble did not validate both addresses.');
 const source=raw as Record<string,unknown>;
 if(!Number.isSafeInteger(source.address_code)||Number(source.address_code)<=0)throw Error('Shipbubble did not validate both addresses.');
 const data:ValidatedAddress={address_code:Number(source.address_code)};
 for(const field of ['country_code','postal_code','city','state'] as const)if(typeof source[field]==='string')data[field]=source[field].slice(0,100);
 await db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(cacheKey,JSON.stringify({data,expiresAt:Date.now()+30*86400000})).run();
 await db.prepare("DELETE FROM store_meta WHERE key LIKE 'shipbubble-address:%' AND json_extract(value,'$.expiresAt')<?").bind(Date.now()).run();
 return data;
}
