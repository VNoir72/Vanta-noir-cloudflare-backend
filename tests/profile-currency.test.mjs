import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';
await build({stdin:{contents:`import {profileDetailsSchema} from './lib/customer-profile';import {currencyRates} from './lib/currency-rates';export default {async fetch(r){if(new URL(r.url).pathname==='/rates')return currencyRates();const v=profileDetailsSchema.safeParse(await r.json());return Response.json({valid:v.success},{status:v.success?200:400});}}`,resolveDir:process.cwd()},outfile:'work/profile-currency.mjs',bundle:true,format:'esm',platform:'neutral',external:['cloudflare:workers']});
test('profile validates images and real birthdays; rates are cached without changing NGN base',async()=>{
 let calls=0;const at=Math.floor(Date.now()/1000),rates={NGN:1,USD:0.00065,GBP:0.0005,EUR:0.0006};
 const mf=new Miniflare({modules:true,scriptPath:'work/profile-currency.mjs',compatibilityDate:'2026-10-08',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],outboundService:async()=>{calls++;return Response.json({result:'success',base_code:'NGN',time_last_update_unix:at,rates});}});
 try{const db=await mf.getD1Database('DB');await db.prepare('CREATE TABLE store_meta(key TEXT PRIMARY KEY,value TEXT)').run();
 for(const [v,expected] of [[{photo:'data:image/jpeg;base64,/9j/AA==',birthday:'2000-02-29'},200],[{photo:'data:image/svg+xml;base64,AA=='},400],[{birthday:'2025-02-29'},400],[{birthday:'2999-01-01'},400],[{photo:'x'.repeat(1500101)},400]])assert.equal((await mf.dispatchFetch('https://test.invalid/profile',{method:'POST',body:JSON.stringify(v)})).status,expected);
 for(let i=0;i<2;i++){const response=await mf.dispatchFetch('https://test.invalid/rates');assert.equal(response.status,200);const v=await response.json();assert.equal(v.base_code,'NGN');assert.equal(v.rates.NGN,1);assert.equal(10000000/100*v.rates.USD,65);}
 assert.equal(calls,1,'second request reuses verified store-wide rates');
 }finally{await mf.dispose();}
});
