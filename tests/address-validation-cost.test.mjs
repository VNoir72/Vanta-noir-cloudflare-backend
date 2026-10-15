import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';
test('concurrent verification pays once, cached reuse bypasses exhausted budget, and new addresses respect budget',async()=>{
 await build({stdin:{contents:`import {cachedShipbubbleAddress} from './lib/shipbubble-address-cache';export default {async fetch(r){try{return Response.json(await cachedShipbubbleAddress('fixture-key',await r.json(),async()=>{const r=await fetch('https://validation.invalid/');return r.json()}));}catch(e){return Response.json({error:e.message},{status:409})}}}`,resolveDir:process.cwd()},outfile:'work/address-cost.mjs',bundle:true,format:'esm',platform:'neutral',external:['cloudflare:workers']});
 let calls=0;const mf=new Miniflare({modules:true,scriptPath:'work/address-cost.mjs',compatibilityDate:'2026-10-08',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],outboundService:async()=>{calls++;await new Promise(r=>setTimeout(r,60));return Response.json({address_code:123});}});
 try{const db=await mf.getD1Database('DB');await db.batch([db.prepare('CREATE TABLE store_meta(key TEXT PRIMARY KEY,value TEXT)'),db.prepare('CREATE TABLE request_limits(key TEXT PRIMARY KEY,hits INTEGER,expires_at INTEGER)')]);
 const address={name:'Test Customer',email:'test@example.com',phone:'+2348000000000',address:'12 Test Road, Lagos, Nigeria'};
 const request=(v=address)=>mf.dispatchFetch('https://test.invalid/',{method:'POST',body:JSON.stringify(v)});
 const pair=await Promise.all([request(),request()]);assert.deepEqual(pair.map(r=>r.status).sort(),[200,409]);assert.equal(calls,1);
 await db.prepare("UPDATE request_limits SET hits=5000 WHERE key LIKE 'service-budget:address:%'").run();
 assert.equal((await request()).status,200);assert.equal(calls,1);
 assert.equal((await request({...address,address:'13 Test Road, Lagos, Nigeria'})).status,409);assert.equal(calls,1);
 assert.equal((await db.prepare("SELECT COUNT(*) n FROM store_meta WHERE key LIKE 'shipbubble-validation-lock:%'").first()).n,0);
 }finally{await mf.dispose()}
});
