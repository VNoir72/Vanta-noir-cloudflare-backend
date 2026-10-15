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
  await t.test('concurrent unpaid reservations are bounded per buyer and IP, and expiry frees capacity',async()=>{
   const product=(await rpc('listCatalog'))[0],variantId=product.colorways[0].variantIds.S;
   await db.prepare('UPDATE product_variants SET stock=100 WHERE id=?').bind(variantId).run();
   const input={customer:{email:'reserve@example.invalid',firstName:'Test',lastName:'Buyer',phone:'08000000000',addressLine1:'Test address',addressLine2:'',city:'Lagos',state:'Lagos',countryCode:'NG'},cart:[{variantId,quantity:1}],shippingKobo:0,expectedTotalKobo:product.priceKobo,reservationActor:'fixture-ip'};
   const create=value=>mf.dispatchFetch('https://api.example.invalid/test',{method:'POST',body:JSON.stringify({action:'createPendingOrder',args:[value]})});
   const results=await Promise.all(Array.from({length:6},()=>create(input)));
   assert.equal(results.filter(r=>r.status===200).length,2);
   const other={...input,customer:{...input.customer,email:'other@example.invalid'}};
   assert.equal((await create(other)).status,200);
   assert.notEqual((await create({...other,customer:{...other.customer,email:'third@example.invalid'}})).status,200,'changing email cannot evade IP cap');
   await db.prepare("UPDATE stock_reservations SET expires_at=datetime('now','-1 minute')").run();
   assert.equal((await create(input)).status,200);
   await db.prepare('DELETE FROM stock_reservations').run();
   await create(input);
   assert.notEqual((await create(input)).status,200,'daily cap survives reservation expiry');
  });
  await t.test('push device cap is atomic and stale tokens are removed',async()=>{
   const register=token=>mf.dispatchFetch('https://api.example.invalid/test',{method:'POST',body:JSON.stringify({action:'registerPush',args:['fixture-customer',token]})});
   const results=await Promise.all(Array.from({length:9},(_,i)=>register('ExpoPushToken[fixture_'+i+']')));
   assert.equal(results.filter(r=>r.status===200).length,5);
   assert.equal((await db.prepare("SELECT COUNT(*) n FROM store_meta WHERE key LIKE 'push-device:%'").first()).n,5);
   await db.prepare("UPDATE store_meta SET value=json_set(value,'$.lastSeen',0) WHERE key LIKE 'push-device:%'").run();
   await rpc('sendOrderPushUpdates');
   assert.equal((await db.prepare("SELECT COUNT(*) n FROM store_meta WHERE key LIKE 'push-device:%'").first()).n,0);
  });
  await t.test('API guard shares a bucket across random paths and leaves signed webhooks independent',async()=>{
   for(let i=0;i<60;i++)assert.equal((await rpc('guardFixture','https://api.example.invalid/api/random-'+i,'POST','192.0.2.200')).status,200);
   const blocked=await rpc('guardFixture','https://api.example.invalid/api/checkout','POST','192.0.2.200');assert.equal(blocked.status,429);assert.equal(blocked.retry,'60');
   assert.equal((await rpc('guardFixture','https://api.example.invalid/api/paystack/webhook','POST','192.0.2.200')).status,200);
  });
  await t.test('global service budget is atomic across concurrent callers and can recover after expiry',async()=>{
   assert.equal(await rpc('serviceBudget','sms',21),false);
   const responses=await Promise.all(Array.from({length:25},()=>rpc('serviceBudget','sms',1)));
   assert.equal(responses.filter(Boolean).length,20);
   assert.equal(await rpc('serviceBudget','sms',1),false);
   await db.prepare("UPDATE request_limits SET expires_at=0 WHERE key LIKE 'service-budget:sms:%'").run();
   assert.equal(await rpc('serviceBudget','sms',1),true);
   assert.equal((await db.prepare("SELECT hits FROM request_limits WHERE key='service-budget:sms:3600'").first()).hits,1);
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
   assert.equal((await paid(second)).status,'processing');
   const late=await paid(first);assert.equal(late.paymentStatus,'paid');assert.equal(late.status,'paid_stock_review');
   assert.equal((await db.prepare('SELECT stock FROM product_variants WHERE id=?').bind(variantId).first()).stock,9);
   assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM stock_adjustments WHERE reason=?').bind('Sale '+first.reference).first()).n,0);
   await paid(first);
   assert.equal((await db.prepare('SELECT stock FROM product_variants WHERE id=?').bind(variantId).first()).stock,9);
  });
 }finally{await mf.dispose();}
});

test('configured maintenance retries failed email and preserves a replacement lease',async()=>{
 await mkdir('work',{recursive:true});
 await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/maintenance-recovery-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 let fail=true,started,release,sends=0;
 const mf=new Miniflare({modules:true,scriptPath:'work/maintenance-recovery-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{RESEND_API_KEY:'fixture-only',EMAIL_FROM:'test@example.invalid'},outboundService:async req=>{
  assert.equal(req.url,'https://api.resend.com/emails');sends++;
  if(started){started();await new Promise(r=>{release=r;});}
  return fail?Response.json({error:'fixture failure'},{status:503}):Response.json({id:'fixture-'+sends});
 }});
 try{
  const db=await mf.getD1Database('DB');
  for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+file,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  const rpc=async(action,...args)=>{const r=await mf.dispatchFetch('https://api.example.invalid/test',{method:'POST',body:JSON.stringify({action,args})});const body=await r.json();assert.equal(r.status,200,JSON.stringify(body));return body;};
  await rpc('queueEmail','fixture-maintenance','buyer@example.invalid','Fixture','Dummy notification');
  await db.prepare("INSERT INTO request_limits(key,hits,expires_at) VALUES('service-budget:email:3600',200,?)").bind(Math.floor(Date.now()/1000)+3600).run();
  assert.equal((await rpc('processEmailOutbox')).sent,0);assert.equal(sends,0,'budget exhaustion never calls provider');
  const delayed=await db.prepare("SELECT status,attempts FROM email_outbox WHERE event_key='fixture-maintenance'").first();assert.equal(delayed.status,'pending');assert.equal(delayed.attempts,0);
  await db.prepare("DELETE FROM request_limits WHERE key LIKE 'service-budget:email:%'").run();
  await db.prepare("UPDATE email_outbox SET next_attempt_at=datetime('now','-1 minute')").run();
  const failed=await rpc('runCommerceMaintenance');assert.equal(failed.configured,true);assert.equal(failed.sent,0);
  const row=await db.prepare("SELECT status,attempts FROM email_outbox WHERE event_key='fixture-maintenance'").first();assert.equal(row.status,'pending');assert.equal(row.attempts,1);
  assert.equal((await rpc('runCommerceMaintenance')).skipped,true);
  await db.prepare("UPDATE email_outbox SET next_attempt_at=datetime('now','-1 minute')").run();
  await db.prepare("UPDATE store_meta SET value=? WHERE key='commerce-maintenance-lease'").bind(JSON.stringify({token:'expired',expiresAt:0})).run();
  fail=false;
  const sent=await rpc('runCommerceMaintenance');assert.equal(sent.sent,1);assert.equal(sends,2);
  await rpc('queueEmail','fixture-stale-holder','buyer@example.invalid','Fixture','Dummy notification');
  await db.prepare("UPDATE store_meta SET value=? WHERE key='commerce-maintenance-lease'").bind(JSON.stringify({token:'expired',expiresAt:0})).run();
  const reached=new Promise(r=>{started=r;});
  const running=rpc('runCommerceMaintenance');await reached;
  const replacement={token:'replacement-holder',expiresAt:Date.now()+300000};
  await db.prepare("UPDATE store_meta SET value=? WHERE key='commerce-maintenance-lease'").bind(JSON.stringify(replacement)).run();
  release();await running;
  assert.deepEqual(JSON.parse((await db.prepare("SELECT value FROM store_meta WHERE key='commerce-maintenance-lease'").first()).value),replacement);
  assert.equal((await rpc('runCommerceMaintenance')).skipped,true);
 }finally{if(release)release();await mf.dispose();}
});

test('body byte limit rejects headerless and understated payloads and preserves signed raw bytes',async()=>{
 await build({entryPoints:['lib/http-policy.ts'],outfile:'work/security-http-policy.mjs',bundle:true,platform:'node',format:'esm'});
 const {boundedApiRequest}=await import(pathToFileURL(resolve('work/security-http-policy.mjs')).href);
 for(const headers of [{},{'Content-Length':'1'}]){
  const result=await boundedApiRequest(new Request('https://api.example.invalid/api/checkout',{method:'POST',headers,body:'x'.repeat(128*1024+1)}));assert.equal(result.status,413);
 }
 const slow=new Request('https://api.example.invalid/api/checkout',{method:'POST',duplex:'half',body:new ReadableStream({start(){}})});
 assert.equal((await boundedApiRequest(slow,20)).status,408);
 const raw='{ "signed": true, "spacing": "preserved" }';
 const result=await boundedApiRequest(new Request('https://api.example.invalid/api/paystack/webhook',{method:'POST',body:raw}));
 assert.equal(await result.text(),raw);
});

test('shared response hardening preserves a stricter route CSP',async()=>{
 await build({entryPoints:['lib/http-policy.ts'],outfile:'work/security-http.mjs',bundle:true,platform:'node',format:'esm'});
 const {secureResponse}=await import(pathToFileURL(resolve('work/security-http.mjs')).href);
 const policy="default-src 'none'; img-src 'self'; frame-ancestors 'none'";
 const response=secureResponse(new Response('safe',{headers:{'Content-Security-Policy':policy}}),new Request('https://api.example.invalid/api/admin/tech-packs'),{});
 assert.equal(response.headers.get('Content-Security-Policy'),policy);
 assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
 assert.equal(response.headers.get('Cache-Control'),'no-store');
});
