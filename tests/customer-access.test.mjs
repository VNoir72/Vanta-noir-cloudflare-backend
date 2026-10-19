import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdir,readFile} from 'node:fs/promises';
import {generateKeyPair,exportJWK,exportPKCS8,SignJWT} from 'jose';
import {Miniflare} from './miniflare.mjs';

test('owner suspension revokes web/native sessions, rejects replay and checkout, restores only fresh sign-in, and audits atomic changes',async()=>{
 await mkdir('work',{recursive:true});
 await build({entryPoints:['tests/customer-access-worker.ts'],outfile:'work/customer-access.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const {publicKey,privateKey}=await generateKeyPair('RS256',{extractable:true}),jwk={...await exportJWK(publicKey),kid:'fixture'};
 const now=Math.floor(Date.now()/1000),issuer='https://test.cloudflareaccess.com';let providerCalls=0;
 const accessToken=email=>new SignJWT({email}).setProtectedHeader({alg:'RS256',kid:'fixture'}).setIssuer(issuer).setAudience('test-aud').setIssuedAt().setExpirationTime('10m').sign(privateKey);
 const identityToken=auth_time=>new SignJWT({sub:'buyer',email:'buyer@example.com',email_verified:true,auth_time,firebase:{sign_in_provider:'google.com'}}).setProtectedHeader({alg:'RS256',kid:'fixture'}).setIssuer('https://securetoken.google.com/vanta-noir').setAudience('vanta-noir').setIssuedAt().setExpirationTime('10m').sign(privateKey);
 const owner=await accessToken('owner@example.com'),staff=await accessToken('staff@example.com');
 const mf=new Miniflare({modules:true,scriptPath:'work/customer-access.mjs',compatibilityDate:'2026-10-08',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{AUTH_PROVIDER:'cloudflare-access',ADMIN_EMAIL:'owner@example.com',CF_ACCESS_TEAM_DOMAIN:issuer,CF_ACCESS_AUD:'test-aud',CUSTOMER_APP_ENABLED:'true',FIREBASE_AUTH_ENABLED:'true',FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify({project_id:'vanta-noir',client_email:'test@example.com',private_key:await exportPKCS8(privateKey)}),PAYSTACK_SECRET_KEY:'sk_test_fixture',STOREFRONT_URL:'https://vantanoir.store',ALLOWED_ORIGINS:'https://vantanoir.store'},outboundService:async req=>{
  if(req.url.endsWith('/cdn-cgi/access/certs')||req.url.includes('/jwk/securetoken@'))return Response.json({keys:[jwk]});
  if(req.url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'fixture',expires_in:3600});
  if(req.url.endsWith('accounts:lookup')){providerCalls++;return Response.json({users:[{localId:'buyer',email:'buyer@example.com',emailVerified:true,validSince:'0'}]});}
  throw Error('Unexpected external request: '+req.url);
 }});
 try{
  const db=await mf.getD1Database('DB');
  const sql=await readFile('drizzle/0017_customer_app.sql','utf8');await db.batch(sql.split(';').filter(s=>s.trim()).map(s=>db.prepare(s)));
  await db.batch([
   db.prepare('CREATE TABLE store_meta(key TEXT PRIMARY KEY,value TEXT)'),
   db.prepare('CREATE TABLE request_limits(key TEXT PRIMARY KEY,hits INTEGER,expires_at INTEGER)'),
   db.prepare('CREATE TABLE admin_audit(id INTEGER PRIMARY KEY,actor TEXT,action TEXT,entity TEXT,detail TEXT)'),
   db.prepare('CREATE TABLE admin_staff(email TEXT PRIMARY KEY,role TEXT,active INTEGER)'),
   db.prepare("INSERT INTO admin_staff VALUES('staff@example.com','support',1)"),
   db.prepare("INSERT INTO app_customers(id,email,created_at) VALUES('buyer-id','buyer@example.com',?)").bind(Date.now()),
   db.prepare("INSERT INTO store_meta VALUES('firebase-customer:buyer-id','buyer')"),
   db.prepare('CREATE TABLE orders(reference TEXT PRIMARY KEY,payment_status TEXT)'),
   db.prepare("INSERT INTO orders VALUES('PAID-KEEP','paid')"),
  ]);
  const req=async(path,body,headers={},method=body?'POST':'GET')=>{
   const r=await mf.dispatchFetch('https://api.vantanoir.store'+path,{method,headers:{'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};
  };
  const admin={'cf-access-jwt-assertion':owner},email='buyer@example.com';
  const change=(action,version,reason='Review suspicious activity',headers=admin)=>req('/api/admin/customer-access',{email,action,version,reason},headers);
  assert.equal((await change('suspend',0,'Review fraud',{})).status,403);
  assert.equal((await change('suspend',0,'Review fraud',{'cf-access-jwt-assertion':staff})).status,403);
  assert.equal((await change('suspend',0,'')).status,400);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM admin_audit').first()).n,0);
  const oldId=await identityToken(now-10);
  const login=await req('/api/customer/firebase',{idToken:oldId,acceptTerms:true});assert.equal(login.status,200);
  const bearer={Authorization:'Bearer '+login.data.token};
  const cookie={'X-Vanta-Web':'1',Origin:'https://vantanoir.store',Cookie:'__Host-vn-session='+login.data.token};
  assert.ok((await req('/test/session',null,bearer)).data.session);
  assert.ok((await req('/test/session',null,cookie)).data.session);
  await db.prepare("INSERT INTO store_meta VALUES('deletion-grant:fixture',?)").bind(JSON.stringify({customerId:'buyer-id',expiresAt:Date.now()+60000})).run();
  const suspended=await change('suspend',0);assert.equal(suspended.status,200);assert.equal(suspended.data.status,'suspended');assert.equal(suspended.data.version,1);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM app_sessions').first()).n,0);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM store_meta WHERE key LIKE 'firebase-session:%' OR key LIKE 'deletion-grant:%'").first()).n,0);
  assert.equal((await req('/test/session',null,bearer)).data.session,null);
  assert.equal((await req('/test/session',null,cookie)).data.session,null);
  assert.equal((await req('/api/customer/firebase',{idToken:oldId,acceptTerms:true})).status,401);
  // Even a pre-existing or in-flight session inserted after revocation is gated.
  const injected=crypto.randomUUID()+'-'+crypto.randomUUID(),digest=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(injected))).toString('hex');
  await db.batch([db.prepare('INSERT INTO app_sessions VALUES(?,?,?,?)').bind(digest,'buyer-id',(now-10)*1000,Date.now()+60000),db.prepare('INSERT INTO store_meta VALUES(?,?)').bind('firebase-session:'+digest,'buyer')]);
  const before=providerCalls;assert.equal((await req('/test/session',null,{Authorization:'Bearer '+injected})).data.session,null);assert.equal(providerCalls,before,'local block works before provider calls');
  const blocked=await req('/test/order',{customer:{email:' BUYER@example.com '}});assert.equal(blocked.status,400);assert.match(blocked.data.error,/restricted/);
  const checkout={expectedTotalKobo:1000,customer:{firstName:'Buyer',lastName:'Name',email,phone:'+2348000000000',addressLine1:'10 Main Street',addressLine2:'',city:'Lagos',state:'Lagos',countryCode:'NG',postalCode:'100001'},cart:[{variantId:'fixture',quantity:1}]};
  const guest=await req('/api/checkout',checkout);assert.equal(guest.status,403,JSON.stringify(guest));
  assert.equal((await change('restore',0,'Investigation complete')).status,409,'stale restore cannot override suspension');
  const restored=await change('restore',1,'Investigation complete');assert.equal(restored.status,200);assert.equal(restored.data.status,'active');
  assert.equal((await req('/api/customer/firebase',{idToken:oldId,acceptTerms:true})).status,401,'restore never revives old Firebase tokens');
  const fresh=await req('/api/customer/firebase',{idToken:await identityToken(Math.floor(Date.now()/1000)+1),acceptTerms:true});assert.equal(fresh.status,200,JSON.stringify(fresh));
  assert.ok((await req('/test/session',null,{Authorization:'Bearer '+fresh.data.token})).data.session);
  assert.equal((await req('/test/session',null,bearer)).data.session,null,'old store session stays revoked');
  const concurrent=await Promise.all([change('suspend',2),change('restore',2,'Conflicting restore')]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
  const audit=await db.prepare('SELECT * FROM admin_audit ORDER BY id').all();assert.equal(audit.results.length,3);assert.equal(audit.results[0].actor,'owner@example.com');assert.equal(JSON.parse(audit.results[0].detail).reason,'Review suspicious activity');
  assert.equal((await db.prepare("SELECT payment_status FROM orders WHERE reference='PAID-KEEP'").first()).payment_status,'paid');
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM app_customers').first()).n,1,'suspension does not delete customer');
 }finally{await mf.dispose();}
});
