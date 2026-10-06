import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';
import {mkdir,readdir,readFile} from 'node:fs/promises';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';

test('walk-in sales reserve shared stock and finalize only once with owner approval',async()=>{
 await mkdir('work',{recursive:true});await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/sales-test-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const {publicKey,privateKey}=await generateKeyPair('RS256',{extractable:true}),issuer='https://sales-test.cloudflareaccess.com',jwk={...await exportJWK(publicKey),kid:'sales',alg:'RS256',use:'sig'};
 const mf=new Miniflare({modules:true,scriptPath:'work/sales-test-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{ADMIN_EMAIL:'owner@example.com',AUTH_PROVIDER:'cloudflare-access',CF_ACCESS_TEAM_DOMAIN:issuer,CF_ACCESS_AUD:'sales'},outboundService:async()=>Response.json({keys:[jwk]})});
 try{
  const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  const rpc=async(action,...args)=>{const r=await mf.dispatchFetch('https://api.example.com/test',{method:'POST',body:JSON.stringify({action,args})});const p=await r.json();assert.equal(r.status,200,p?.error);return p;};
  const tokens={};for(const role of ['owner','sales','catalogue','other']){tokens[role]=await new SignJWT({email:role+'@example.com'}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setIssuer(issuer).setAudience('sales').setIssuedAt().setExpirationTime('10m').sign(privateKey);if(role!=='owner')await rpc('saveStaff',{email:role+'@example.com',role:role==='other'?'sales':role,active:true},'owner@example.com');}
  const request=async(role,path,method='GET',body)=>mf.dispatchFetch('https://api.example.com/api/admin/'+path,{method,headers:{'cf-access-jwt-assertion':tokens[role],Origin:'https://api.example.com','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const products=await rpc('listCatalog'),p=products[0],variantId=p.colorways[0].variantIds.S;
  await db.prepare('UPDATE product_variants SET stock=5 WHERE id=?').bind(variantId).run();
  const input=(quantity=2)=>({clientId:crypto.randomUUID(),items:[{variantId,quantity,expectedPriceKobo:p.priceKobo}],paymentMethod:'transfer',paymentReference:'BANK-1',customer:'Walk-in customer'});
  const submit=async(body,role='sales')=>{const r=await request(role,'sales','POST',body),v=await r.json();assert.equal(r.status,202,JSON.stringify(v));return v;};
  const review=(id,decision='approve')=>request('owner','approvals','POST',{id,decision});
  const stock=async()=>(await db.prepare('SELECT stock FROM product_variants WHERE id=?').bind(variantId).first()).stock;
  const reserved=async()=>(await db.prepare('SELECT COALESCE(SUM(quantity),0) AS n FROM stock_reservations WHERE variant_id=?').bind(variantId).first()).n;
  assert.equal((await request('catalogue','sales')).status,403);assert.equal((await request('sales','operations?resource=staff')).status,403);
  const firstInput=input(),duplicates=await Promise.all([submit(firstInput),submit(firstInput)]),first=duplicates[0];assert.equal(first.id,duplicates[1].id);assert.equal(await stock(),5);assert.equal(await reserved(),2);
  const listed=await (await request('sales','sales?q='+encodeURIComponent(p.name))).json();assert.equal(listed.variants.find(v=>v.id===variantId).available,3);assert.equal(listed.pending,1);assert.equal((await (await request('other','sales')).json()).sales.length,0);
  assert.equal((await request('sales','approvals','POST',{id:first.id,decision:'approve'})).status,403);
  assert.equal((await request('sales','sales','POST',{...firstInput,customer:'Changed'})).status,409);assert.equal(await reserved(),2);
  assert.equal((await request('sales','sales','POST',input(4))).status,409);assert.equal(await reserved(),2);
  const bad=input(1);bad.items[0].expectedPriceKobo++;assert.equal((await request('sales','sales','POST',bad)).status,409);
  const dupe=input(1);dupe.items.push({...dupe.items[0]});assert.equal((await request('sales','sales','POST',dupe)).status,400);
  const altered=input(1);altered.items[0].unitPriceKobo=1;assert.equal((await request('sales','sales','POST',altered)).status,400);
  const noRef=input(1);noRef.paymentReference='';assert.equal((await request('sales','sales','POST',noRef)).status,400);
  // The existing public checkout must respect the sale's hold.
  const attempt=await mf.dispatchFetch('https://api.example.com/test',{method:'POST',body:JSON.stringify({action:'createPendingOrder',args:[{customer:{email:'buyer@example.com',firstName:'A',lastName:'B',phone:'08000000000',addressLine1:'A street',addressLine2:'',city:'Kaduna',state:'Kaduna'},cart:[{variantId,quantity:4}],shippingKobo:0,expectedTotalKobo:p.priceKobo*4}]})});assert.equal(attempt.status,400);
  const statuses=await Promise.all([review(first.id),review(first.id)]);assert.deepEqual(statuses.map(r=>r.status).sort(),[200,409]);assert.equal(await stock(),3);assert.equal(await reserved(),0);
  assert.equal((await submit(firstInput)).id,first.id);assert.equal(await stock(),3);
  const order=await db.prepare('SELECT status,payment_status FROM orders WHERE reference=?').bind(first.reference).first();assert.deepEqual(order,{status:'delivered',payment_status:'paid'});
  const rejected=await submit(input(2));assert.equal(await reserved(),2);assert.equal((await review(rejected.id,'reject')).status,200);assert.equal(await stock(),3);assert.equal(await reserved(),0);
  // Last-unit contention is resolved inside the atomic batch.
  const race=await Promise.all([request('sales','sales','POST',input(3)),request('other','sales','POST',input(3))]);assert.deepEqual(race.map(r=>r.status).sort(),[202,409]);const won=await race.find(r=>r.status===202).json();assert.equal(await reserved(),3);await review(won.id,'reject');
  const revoked=await submit(input(1));await rpc('saveStaff',{email:'sales@example.com',role:'sales',active:false},'owner@example.com');assert.equal((await review(revoked.id)).status,409);assert.equal((await request('sales','sales')).status,403);await review(revoked.id,'reject');assert.equal(await reserved(),0);
  await rpc('saveStaff',{email:'sales@example.com',role:'sales',active:true},'owner@example.com');const removed=await submit(input(1));await rpc('deleteStaff',{email:'sales@example.com'},'owner@example.com');assert.equal(await reserved(),0);assert.equal((await review(removed.id)).status,409);assert.equal(await stock(),3);
  const ownerSale=await submit(input(1),'owner');assert.equal((await review(ownerSale.id)).status,200);assert.equal(await stock(),2);
  console.log('Verified role boundaries, shared availability, retries, price protection, insufficient stock, concurrent submissions/reviews, rejection, staff revocation/deletion, and owner sales.');
 }finally{await mf.dispose();}
});
