import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdir,readdir,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {Miniflare} from './miniflare.mjs';

// Run only in a network-isolated test environment. All identities and services are fixtures.
test('storefront redirects retain their configured origin',async()=>{
 await mkdir('work',{recursive:true});
 await build({entryPoints:['lib/storefront-redirect.ts'],outfile:'work/security-redirect.mjs',bundle:true,platform:'node',format:'esm'});
 const {storefrontRedirectUrl}=await import(pathToFileURL(resolve('work/security-redirect.mjs')).href);
 for(const path of ['/about','//outside.example.invalid/a','///outside.example.invalid/a','/%2f%2foutside.example.invalid/a','/\\outside.example.invalid/a']){
  const request=new URL('https://api.example.invalid'+path+'?q=hoodie');
  const result=new URL(storefrontRedirectUrl(request,'https://store.example.invalid/'));
  assert.equal(result.origin,'https://store.example.invalid');
  assert.equal(result.search,'?q=hoodie');
 }
 assert.equal(storefrontRedirectUrl(new URL('https://api.example.invalid/contact'),'https://store.example.invalid/'),'https://store.example.invalid/contact');
});

test('security boundaries: expiry, preference limits, shared maintenance and late promotions',async t=>{
 await mkdir('work',{recursive:true});
 await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/security-hardening-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const {publicKey,privateKey}=await generateKeyPair('RS256');
 const issuer='https://security-fixture.cloudflareaccess.com';
 const jwk={...await exportJWK(publicKey),kid:'security-fixture',alg:'RS256',use:'sig'};
 const mf=new Miniflare({modules:true,scriptPath:'work/security-hardening-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{ADMIN_EMAIL:'owner@example.invalid',AUTH_PROVIDER:'cloudflare-access',CF_ACCESS_TEAM_DOMAIN:issuer,CF_ACCESS_AUD:'security-fixture'},outboundService:async req=>{
  assert.equal(req.url,issuer+'/cdn-cgi/access/certs','No external provider call is allowed');
  return Response.json({keys:[jwk]});
 }});
 try{
  const db=await mf.getD1Database('DB');
  for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){
   const statements=(await readFile('drizzle/'+file,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean);
   await db.batch(statements.map(s=>db.prepare(s)));
  }
  const rpc=async(action,...args)=>{
   const r=await mf.dispatchFetch('https://api.example.invalid/test',{method:'POST',body:JSON.stringify({action,args})});
   const body=await r.json();assert.equal(r.status,200,JSON.stringify(body));return body;
  };
  await t.test('valid staff session succeeds; signed token without expiry is rejected',async()=>{
   const token=expiry=>{let jwt=new SignJWT({email:'owner@example.invalid'}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setIssuer(issuer).setAudience('security-fixture').setIssuedAt();if(expiry)jwt=jwt.setExpirationTime(expiry);return jwt.sign(privateKey);};
   const request=async expiry=>mf.dispatchFetch('https://api.example.invalid/api/admin/chat',{headers:{'cf-access-jwt-assertion':await token(expiry)}});
   assert.equal((await request('10m')).status,200);
   assert.equal((await request(null)).status,403);
   assert.equal((await request('-1m')).status,403);
  });
  await t.test('preference retries succeed within budget and stop beyond it',async()=>{
   const token=randomUUID()+randomUUID();
   await db.prepare("INSERT INTO subscribers(id,email,kind,variant_id,token,status) VALUES(?,?,'newsletter','',?,'active')").bind(randomUUID(),'subscriber@example.invalid',token).run();
   const preference=action=>mf.dispatchFetch('https://api.example.invalid/api/subscriptions',{method:'POST',headers:{'Content-Type':'application/json','cf-connecting-ip':'192.0.2.1'},body:JSON.stringify({action,token})});
   assert.equal((await preference('confirm')).status,200);
   for(let i=1;i<20;i++)assert.equal((await preference('unsubscribe')).status,200);
   assert.equal((await preference('unsubscribe')).status,429);
   assert.equal((await db.prepare('SELECT status FROM subscribers WHERE token=?').bind(token).first()).status,'unsubscribed');
  });
  await t.test('simultaneous maintenance shares one lease and expired leases recover',async()=>{
   const results=await Promise.all([rpc('runCommerceMaintenance'),rpc('runCommerceMaintenance')]);
   assert.equal(results.filter(r=>r.skipped===true).length,1);
   assert.equal((await rpc('runCommerceMaintenance')).skipped,true);
   const row=await db.prepare("SELECT value FROM store_meta WHERE key='commerce-maintenance-lease'").first();
   assert.ok(JSON.parse(row.value).expiresAt>Date.now());
   await db.prepare("UPDATE store_meta SET value=? WHERE key='commerce-maintenance-lease'").bind(JSON.stringify({token:'expired-fixture',expiresAt:0})).run();
   assert.notEqual((await rpc('runCommerceMaintenance')).skipped,true);
  });
  await t.test('late capped promotion payment is recorded but does not allocate stock',async()=>{
   await db.prepare('DELETE FROM reward_campaigns').run();
   const product=(await rpc('listCatalog'))[0],variantId=product.colorways[0].variantIds.S;
   await db.prepare('UPDATE product_variants SET stock=10 WHERE id=?').bind(variantId).run();
   await rpc('savePromotion',{code:'CAPONE',title:'One use fixture',kind:'percent',value:10,minimumKobo:0,minimumQuantity:1,productIds:[],maxUses:1,startsAt:'2020-01-01T00:00:00.000Z',endsAt:'2099-01-01T00:00:00.000Z',active:true,version:0},'owner@example.invalid');
   const input={customer:{email:'buyer@example.invalid',firstName:'Test',lastName:'Buyer',phone:'08000000000',addressLine1:'Test address',addressLine2:'',city:'Lagos',state:'Lagos',countryCode:'NG'},cart:[{variantId,quantity:1}],promotionCode:'CAPONE',shippingKobo:0,expectedTotalKobo:product.priceKobo-Math.floor(product.priceKobo*.1)};
   const first=await rpc('createPendingOrder',input);
   await db.prepare("UPDATE orders SET created_at=datetime('now','-20 minutes') WHERE id=?").bind(first.id).run();
   await db.prepare("UPDATE stock_reservations SET expires_at=datetime('now','-1 minute') WHERE order_id=?").bind(first.id).run();
   const second=await rpc('createPendingOrder',input);
   const paid=o=>rpc('markOrderPaid',{reference:o.reference,amountKobo:o.totalKobo,eventKey:'fixture:'+o.reference,eventType:'verify.success',paymentDomain:'test'});
   assert.equal((await paid(second)).status,'paid');
   const late=await paid(first);assert.equal(late.paymentStatus,'paid');assert.equal(late.status,'paid_stock_review');
   assert.equal((await db.prepare('SELECT stock FROM product_variants WHERE id=?').bind(variantId).first()).stock,9);
   assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM stock_adjustments WHERE reason=?').bind('Sale '+first.reference).first()).n,0);
   await paid(first);
   assert.equal((await db.prepare('SELECT stock FROM product_variants WHERE id=?').bind(variantId).first()).stock,9);
  });
 }finally{await mf.dispose();}
});
