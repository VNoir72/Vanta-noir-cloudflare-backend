import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
// Runs the compiled backend in an isolated, temporary Worker with local D1/R2.
// It never sends requests to a production service.
const projectRoot=resolve(process.argv[2] || '.');
const projectPath=p=>resolve(projectRoot,p);
const {publicKey,privateKey}=await generateKeyPair('RS256');
const jwk={...await exportJWK(publicKey),kid:'release-check',alg:'RS256',use:'sig'};
const issuer='https://release-test.cloudflareaccess.com';
const token=await new SignJWT({email:'owner@example.com'}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setIssuer(issuer).setAudience('release-aud').setIssuedAt().setExpirationTime('10m').sign(privateKey);
const moduleRoot=projectPath('dist/server');
const moduleFiles=(await readdir(moduleRoot,{recursive:true})).filter(p=>p.endsWith('.js')&&p!=='index.js');
const workerModules=['index.js',...moduleFiles].map(p=>({type:'ESModule',path:resolve(moduleRoot,p)}));
const mf=new Miniflare(convertV4MiniflareOptions({modules:workerModules,modulesRoot:moduleRoot,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{AUTH_PROVIDER:'cloudflare-access',ADMIN_EMAIL:'owner@example.com',CF_ACCESS_TEAM_DOMAIN:issuer,CF_ACCESS_AUD:'release-aud',STOREFRONT_URL:'https://vantanoir.store',ALLOWED_ORIGINS:'https://vantanoir.store,https://www.vantanoir.store'},outboundService:async req=>{assert.equal(req.url,issuer+'/cdn-cgi/access/certs');return Response.json({keys:[jwk]});}}));
try{
 // A cold owner page must not need a catalogue query or seed operation.
 const coldPage=await mf.dispatchFetch('https://api.vantanoir.store/admin',{headers:{'cf-access-jwt-assertion':token,Accept:'text/html'}});
 assert.equal(coldPage.status,200);
 const coldHtml=await coldPage.text();
 assert.match(coldHtml,/Loading your dashboard/);
 assert.ok(Buffer.byteLength(coldHtml)<150_000);
 const db=await mf.getD1Database('DB');
 for(const file of (await readdir(projectPath('drizzle'))).filter(x=>x.endsWith('.sql')).sort()){
  const sql=(await readFile(projectPath('drizzle/'+file),'utf8')).replaceAll('--> statement-breakpoint','');
  await db.batch(sql.split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 }
 const sql=await readFile(projectPath('portable/catalog-import.sql'),'utf8');
 for(const line of sql.split('\n').filter(s=>/^(INSERT|UPDATE)\b/.test(s)))await db.prepare(line).run();
 const cat=await mf.dispatchFetch('https://api.vantanoir.store/api/catalog',{headers:{Origin:'https://vantanoir.store'}});
 assert.equal(cat.status,200);assert.equal(cat.headers.get('Access-Control-Allow-Origin'),'https://vantanoir.store');
 const payload=await cat.json();assert.equal(payload.products.length,JSON.parse(await readFile(projectPath("portable/catalog-snapshot.json"),"utf8")).length);assert.equal(payload.checkout.paymentsEnabled,false);assert.equal(payload.checkout.shippingFeeKobo,null);
 assert.ok(payload.products.every(p=>p.colorways.every(c=>Object.values(c.stock).every(n=>n===0))),'Launch seed must not invent available inventory');
 assert.equal((await mf.dispatchFetch('https://api.vantanoir.store/health')).status,200);
 const oldWrite=await mf.dispatchFetch('https://api.vantanoir.store/api/products',{method:'POST',headers:{Origin:'https://api.vantanoir.store','Content-Type':'application/json'},body:'{}'});assert.ok(oldWrite.status>=400,'Old unauthenticated writes must not remain');
 const oldOrders=await mf.dispatchFetch('https://api.vantanoir.store/api/orders');assert.ok(oldOrders.status>=400,'Old order list must not remain public');
 const legacyDenied=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/legacy');assert.equal(legacyDenied.status,403);
 const aliasWebhook=await mf.dispatchFetch('https://api.vantanoir.store/api/paystack/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.ok(aliasWebhook.status>=400,'Unsigned webhook alias must fail');
 const denied=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/orders');assert.equal(denied.status,403);
 const authHeaders={'cf-access-jwt-assertion':token,Origin:'https://api.vantanoir.store',Host:'api.vantanoir.store'};
 const admin=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/orders',{headers:authHeaders});assert.equal(admin.status,200);assert.deepEqual((await admin.json()).orders,[]);
 const pageStarted=performance.now(); const adminPage=await mf.dispatchFetch('https://api.vantanoir.store/admin',{headers:{...authHeaders,Accept:'text/html'}});assert.equal(adminPage.status,200);const html=await adminPage.text();console.log(`Admin HTML: ${Math.round(performance.now()-pageStarted)} ms, ${Buffer.byteLength(html)} bytes`);assert.match(html,/Loading your dashboard/);assert.ok(Buffer.byteLength(html)<150_000,"Admin HTML must not embed the full catalogue");assert.match(html,/Presence. Power. Precision./);assert.doesNotMatch(html,/signin-with-chatgpt|codex-preview/);
 // The browser loads these independently after the lightweight authenticated page.
 for (const [resource,key] of [["products","products"],["inventory","inventory"],["analytics","analytics"]]) {
  const url=`https://api.vantanoir.store/api/admin/${resource}`;
  assert.equal((await mf.dispatchFetch(url)).status,403,`${resource} must remain private`);
  const started=performance.now();
  const response=await mf.dispatchFetch(url,{headers:authHeaders});
  assert.equal(response.status,200,`${resource} should load with a valid Access JWT`);
  const result=await response.json();assert.ok(result[key]);
  if(resource==="products") assert.ok(result.products.length>=payload.products.length);
  if(resource==="inventory") assert.ok(result.inventory.length>4000,"Exercise the full stock dataset");
  console.log(`Admin ${resource}: ${Math.round(performance.now()-started)} ms`);
 }
 const invalidPage=await mf.dispatchFetch('https://api.vantanoir.store/admin',{headers:{...authHeaders,'cf-access-jwt-assertion':'invalid',Accept:'text/html'}});
 assert.match(await invalidPage.text(),/Private access is locked/);
 const legacyAllowed=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/legacy',{headers:authHeaders});assert.equal(legacyAllowed.status,200);
 const form=new FormData();form.set('file',new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')],'test.png',{type:'image/png'}));
 const uploadRequest=new Request('https://api.vantanoir.store/api/admin/uploads',{method:'POST',body:form});
 const upload=await mf.dispatchFetch(uploadRequest.url,{method:'POST',headers:{...authHeaders,...Object.fromEntries(uploadRequest.headers)},body:await uploadRequest.arrayBuffer()});const uploaded=await upload.json();assert.equal(upload.status,201,JSON.stringify(uploaded));assert.ok(uploaded.url.startsWith('https://api.vantanoir.store/api/media/products/'));
 const media=await mf.dispatchFetch(uploaded.url);assert.equal(media.status,200);assert.equal(media.headers.get('content-type'),'image/png');assert.equal(media.headers.get('x-content-type-options'),'nosniff');
 assert.equal((await mf.dispatchFetch(uploaded.url,{headers:{'If-None-Match':media.headers.get('etag')}})).status,304);
 const redirect=await mf.dispatchFetch('https://api.vantanoir.store/',{redirect:'manual'});assert.equal(redirect.status,302);assert.equal(redirect.headers.get('location'),'https://vantanoir.store/');
 console.log('Compiled independent Worker passed: catalog import, CORS, fail-closed admin, valid JWT admin rendering, R2 upload/read/cache, storefront redirect.');
}finally{await mf.dispose();}
