import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';
import {mkdir,readdir,readFile} from 'node:fs/promises';

test('demand records unique browser likes, colour/size interest, removal, hidden guards and confirmed opt-ins',async()=>{
 await mkdir('work',{recursive:true});
 await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/demand-test-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const mf=new Miniflare({modules:true,scriptPath:'work/demand-test-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{ADMIN_EMAIL:'owner@example.com',AUTH_PROVIDER:'cloudflare-access',ALLOWED_ORIGINS:'https://vantanoir.store'}});
 try{
  const db=await mf.getD1Database('DB');
  for(const f of (await readdir('drizzle')).filter(x=>x.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  const rpc=async(action,...args)=>{const r=await mf.dispatchFetch('https://api.vantanoir.store/test',{method:'POST',body:JSON.stringify({action,args})});const d=await r.json();assert.equal(r.status,200,JSON.stringify(d));return d;};
  const p=(await rpc('listCatalog'))[0],a=p.colorways[0],b=p.colorways[1],visitorId=crypto.randomUUID();
  const send=body=>mf.dispatchFetch('https://api.vantanoir.store/api/product-interest',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://vantanoir.store','cf-connecting-ip':'demand-test'},body:JSON.stringify(body)});
  const vote={visitorId,productId:p.id,color:a.name,size:Object.keys(a.stock)[0],liked:true};
  const row=async()=> (await rpc('productDemand')).find(x=>x.productId===p.id);
  assert.equal((await send(vote)).status,200);
  await Promise.all(Array.from({length:5},()=>send(vote)));
  assert.equal((await row()).likes,1,'Concurrent retries are idempotent');
  assert.equal((await row()).preferences[0].size,vote.size);
  if(b){assert.equal((await send({...vote,color:b.name,size:''})).status,200);assert.equal((await row()).likes,1,'Multiple saved colours count once per product');assert.equal((await row()).preferences.length,2);}
  assert.equal((await send({...vote,color:'Made up'})).status,400);
  assert.equal((await send({...vote,size:'Impossible size'})).status,400);
  assert.equal((await send({...vote,visitorId:'invalid'})).status,400);
  assert.equal((await mf.dispatchFetch('https://api.vantanoir.store/api/admin/product-demand')).status,403,'Ranking is private');
  await rpc('sql',"INSERT INTO subscribers(id,email,kind,variant_id,status,token) VALUES ('demand-1','one@example.com','release',?,'active','t1'),('demand-2','two@example.com','release',?,'pending','t2'),('demand-3','one@example.com','restock',?,'active','t3')",p.id,p.id,Object.values(a.variantIds)[0]);
  let r=await row();assert.equal(r.confirmedAlerts,1,'Same verified email across release/restock deduplicated');assert.equal(r.pendingAlerts,1);assert.ok(!JSON.stringify(r).includes('@example.com'));
  await rpc('sql',"UPDATE products SET active=0,status='draft' WHERE id=?",p.id);
  assert.equal((await send(vote)).status,400,'Cannot like unpublished products');
  assert.equal((await send({...vote,liked:false})).status,200,'Can remove an old vote after unpublishing');
  if(b)await send({...vote,color:b.name,liked:false});
  assert.equal(await row(),undefined,'No hidden unliked product leaks into the public ranking');
 }finally{await mf.dispose();}
});
