import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';
import {mkdir,readdir,readFile} from 'node:fs/promises';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {createHmac,randomUUID} from 'node:crypto';
test('Resend tracking verifies signatures and owner resends are confirmed, bounded and idempotent',async()=>{
 await mkdir('work',{recursive:true});await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/email-delivery-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const {publicKey,privateKey}=await generateKeyPair('RS256'),issuer='https://email-test.cloudflareaccess.com',jwk={...await exportJWK(publicKey),kid:'email',alg:'RS256',use:'sig'};
 const jwt=email=>new SignJWT({email}).setProtectedHeader({alg:'RS256',kid:'email'}).setIssuer(issuer).setAudience('email').setIssuedAt().setExpirationTime('10m').sign(privateKey);
 const secretBytes=Buffer.from('12345678901234567890123456789012'),secret='whsec_'+secretBytes.toString('base64');let creates=0,sends=[],listDenied=false;
 const mf=new Miniflare({modules:true,scriptPath:'work/email-delivery-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{ADMIN_EMAIL:'owner@example.com',AUTH_PROVIDER:'cloudflare-access',CF_ACCESS_TEAM_DOMAIN:issuer,CF_ACCESS_AUD:'email',RESEND_API_KEY:'re_fixture',EMAIL_FROM:'Vanta Noir <test@example.com>',EMAIL_WEBHOOK_URL:'https://api.example.com/api/email/webhook'},outboundService:async req=>{
  if(req.url===issuer+'/cdn-cgi/access/certs')return Response.json({keys:[jwk]});
  if(req.url.startsWith('https://api.resend.com/webhooks')&&req.method==='GET')return listDenied?Response.json({error:'Restricted'},{status:403}):Response.json({data:[],has_more:false});
  if(req.url==='https://api.resend.com/webhooks'&&req.method==='POST'){creates++;assert.equal((await req.json()).endpoint,'https://api.example.com/api/email/webhook');return Response.json({id:'hook-fixture',signing_secret:secret});}
  assert.equal(req.url,'https://api.resend.com/emails');const body=await req.json();sends.push(body);return Response.json({id:'email-'+sends.length});
 }});
 try{
 const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 const call=async(action,...args)=>{const r=await mf.dispatchFetch('https://api.example.com/test',{method:'POST',body:JSON.stringify({action,args})});return {status:r.status,body:await r.json()};};const rpc=async(action,...args)=>{const r=await call(action,...args);assert.equal(r.status,200,JSON.stringify(r.body));return r.body;};
 const owner=await jwt('owner@example.com'),staff=await jwt('staff@example.com');await rpc('saveStaff',{email:'staff@example.com',role:'support',active:true},'owner@example.com');
 const admin=(token,method='GET',body,origin='https://api.example.com')=>mf.dispatchFetch('https://api.example.com/api/admin/email-delivery',{method,headers:{'cf-access-jwt-assertion':token,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await admin(staff)).status,403);assert.equal((await admin(staff,'POST',{action:'connect'})).status,403);assert.equal((await admin(owner,'POST',{action:'connect'},'https://evil.example')).status,403);
 await Promise.all([rpc('connectEmailTracking'),rpc('connectEmailTracking')]);assert.equal(creates,1);const tracking=await rpc('emailTrackingState');assert.equal(tracking.connected,true);assert.equal(JSON.stringify(tracking).includes('whsec_'),false);
 const stored=(await db.prepare("SELECT value FROM store_meta WHERE key='email-webhook-config'").first()).value;assert.equal(stored.includes(secret),false);assert.equal(stored.includes('re_fixture'),false);
 const event={type:'email.bounced',created_at:new Date().toISOString(),data:{email_id:'email-1'}};
 const hook=async(payload,offset=0,valid=true)=>{const raw=JSON.stringify(payload),id='msg_fixture',timestamp=String(Math.floor(Date.now()/1000)+offset),signature=createHmac('sha256',secretBytes).update(id+'.'+timestamp+'.'+raw).digest('base64');return mf.dispatchFetch('https://api.example.com/api/email/webhook',{method:'POST',body:raw,headers:{'svix-id':id,'svix-timestamp':timestamp,'svix-signature':'v1,'+(valid?signature:'invalid')}});};
 assert.equal((await hook(event,0,false)).status,401);assert.equal((await hook(event,-600)).status,401);assert.equal((await hook(event)).status,200);assert.equal((await hook(event)).status,200);
 const p=(await rpc('listCatalog'))[0],v=p.colorways[0].variantIds.S;await db.prepare('UPDATE product_variants SET stock=5 WHERE id=?').bind(v).run();
 const customer={email:'buyer@example.com',firstName:'Test',lastName:'Buyer',phone:'08000000000',addressLine1:'Test address',addressLine2:'',city:'Lagos',state:'Lagos'};
 const order=await rpc('createPendingOrder',{customer,cart:[{variantId:v,quantity:1}],shippingKobo:0,expectedTotalKobo:p.priceKobo});
 const resend={action:'resend',reference:order.reference,recipient:'corrected@example.com',requestId:randomUUID(),confirmed:true};assert.equal((await admin(owner,'POST',resend)).status,409,'Unpaid orders cannot send a paid confirmation');
 await rpc('markOrderPaid',{reference:order.reference,amountKobo:order.totalKobo,eventKey:'fixture-payment',eventType:'test'});
 assert.equal((await admin(owner,'POST',resend)).status,409,'Original still pending; do not create a duplicate send');
 await rpc('processEmailOutbox',10);let data=await (await admin(owner)).json();const original=data.emails.find(e=>e.eventKey.endsWith(':payment'));assert.equal(original.deliveryStatus,'bounced','Webhook before send response mapping is retained');
 assert.equal((await hook({...event,type:'email.delivered',created_at:new Date(Date.now()-10000).toISOString()})).status,200);assert.equal((await rpc('emailDeliveryData')).emails[0].deliveryStatus,'bounced','Out of order delivered must not hide a bounce');
 assert.equal((await admin(owner,'POST',{...resend,confirmed:false})).status,400);
 const results=await Promise.all([admin(owner,'POST',resend),admin(owner,'POST',resend)]);assert.deepEqual(results.map(r=>r.status),[200,200]);
 assert.equal((await admin(owner,'POST',{...resend,requestId:randomUUID()})).status,409);assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM email_outbox WHERE event_key LIKE 'order:%:manual-confirmation:%'").first()).n,1);
 await rpc('processEmailOutbox',10);assert.equal(sends.filter(s=>s.to.includes('corrected@example.com')).length,1);assert.equal((await db.prepare('SELECT email FROM orders WHERE reference=?').bind(order.reference).first()).email,'buyer@example.com');
 assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM admin_audit WHERE action='resend order confirmation'").first()).n,1);
 await db.prepare("DELETE FROM store_meta WHERE key IN ('email-webhook-config','email-webhook-setup-lock')").run();listDenied=true;await rpc('connectEmailTracking');assert.equal(creates,1);assert.equal((await rpc('emailTrackingState')).state,'setup_required');
 }finally{await mf.dispose();}
});
