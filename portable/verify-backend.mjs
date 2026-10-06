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
 assert.match(coldHtml,/Your workspace is getting ready/);
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
 assert.equal(payload.checkout.internationalEnabled,false);assert.deepEqual(payload.checkout.internationalZones,[]);
 assert.equal(cat.headers.get('X-Frame-Options'),'DENY');assert.match(cat.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
 const noReceipt=await mf.dispatchFetch('https://api.vantanoir.store/api/payments/verify?reference=VN-PRIVATE-TEST');assert.equal(noReceipt.status,403);
 const authHeaders={'cf-access-jwt-assertion':token,Origin:'https://api.vantanoir.store',Host:'api.vantanoir.store'};
 const careResponse=await mf.dispatchFetch('https://api.vantanoir.store/api/support',{method:'POST',headers:{Origin:'https://vantanoir.store','Content-Type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID(),name:'Release Check',email:'care-check@example.com',category:'product',subject:'Product enquiry',message:'Please confirm the product information.',serious:true})});
 assert.equal(careResponse.status,201);assert.equal(careResponse.headers.get('Access-Control-Allow-Origin'),'https://vantanoir.store');assert.match((await careResponse.json()).reference,/^VN-HELP-/);
 const careList=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/support',{headers:authHeaders});assert.equal(careList.status,200);assert.equal((await careList.json()).tickets.length,1);
 await db.prepare("INSERT INTO admin_staff(email,role,active) VALUES('care-agent@example.com','support',1)").run();
 const careToken=await new SignJWT({email:'care-agent@example.com'}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setIssuer(issuer).setAudience('release-aud').setIssuedAt().setExpirationTime('10m').sign(privateKey);
 const carePage=await mf.dispatchFetch('https://api.vantanoir.store/admin',{headers:{'cf-access-jwt-assertion':careToken,Accept:'text/html'}});assert.equal(carePage.status,200);assert.match(await carePage.text(),/Support dashboard/);
 const chatResponse=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/chat',{method:'POST',headers:authHeaders,body:JSON.stringify({action:'send',id:crypto.randomUUID(),channel:'all',body:'Release verification message'})});assert.equal(chatResponse.status,201);
 const staffChat=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/chat',{headers:{'cf-access-jwt-assertion':careToken}});assert.equal(staffChat.status,200);assert.equal((await staffChat.json()).messages.length,1);
 assert.equal((await mf.dispatchFetch('https://api.vantanoir.store/api/admin/chat')).status,403);
 await db.prepare("DELETE FROM admin_staff WHERE email='care-agent@example.com'").run();
 console.log('Compiled customer enquiry, CORS, protected inbox and staff Support page passed.');

 assert.deepEqual(payload.merchandising.sales,[]);assert.equal(payload.merchandising.stockBadgesEnabled,false);
 assert.equal((await mf.dispatchFetch('https://api.vantanoir.store/api/admin/releases')).status,403);
 // New reusable charts: owner-only, same-origin, validated and persisted without changing products.
 const chartUrl='https://api.vantanoir.store/api/admin/size-templates';
 assert.equal((await mf.dispatchFetch(chartUrl)).status,403);
 const chartBody={name:'QA tee',guide:{status:'confirmed',notes:'Measured sample',sections:[{kind:'top',title:'Top',rows:[{size:'S',chest:50,length:65}]}]}};
 assert.equal((await mf.dispatchFetch(chartUrl,{method:'POST',headers:{...authHeaders,Origin:'https://invalid.example'},body:JSON.stringify(chartBody)})).status,403);
 const savedChart=await mf.dispatchFetch(chartUrl,{method:'POST',headers:{...authHeaders,'Content-Type':'application/json'},body:JSON.stringify(chartBody)});assert.equal(savedChart.status,201);
 const charts=await (await mf.dispatchFetch(chartUrl,{headers:authHeaders})).json();assert.equal(charts.templates[0].name,'QA tee');assert.equal(charts.templates[0].guide.status,'reference');assert.equal(charts.templates[0].guide.sections[0].rows[0].chest,50);
 assert.equal((await mf.dispatchFetch(chartUrl,{method:'POST',headers:authHeaders,body:JSON.stringify({...chartBody,name:''})})).status,400);
 // Bounded local resilience exercise. No production, payment or courier requests.
 for(let batch=0;batch<12;batch++)await Promise.all(Array.from({length:8},async()=>{const r=await mf.dispatchFetch(chartUrl,{headers:{'cf-access-jwt-assertion':'malformed.test.token'}});assert.equal(r.status,403);}));
 assert.equal((await mf.dispatchFetch(chartUrl,{headers:authHeaders})).status,200,'Owner access remains responsive after rejected requests');
 console.log('Saved charts and 96 bounded invalid-auth requests passed.');
 const releases=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/releases',{headers:authHeaders});assert.equal(releases.status,200);assert.deepEqual((await releases.json()).campaigns,[]);
 const closedRelease=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/releases',{method:'POST',headers:{...authHeaders,'Content-Type':'application/json'},body:JSON.stringify({productId:payload.products[0].id,confirmed:true})});assert.equal(closedRelease.status,400,'Compiled release route cannot announce unavailable stock/sender');
 const stagedSettings={internationalEnabled:false,internationalZones:[{countryCode:'GB',feeKobo:5000000,estimate:'Test only'}],internationalDutiesNote:'Buyer pays import charges.',hero:{title:'Test campaign'},aboutImage:{image:'/images/about-test.webp',alt:'Independent About campaign',focus:'right'}};
 const saved=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/commerce',{method:'POST',headers:{...authHeaders,'Content-Type':'application/json'},body:JSON.stringify({action:'settings',settings:stagedSettings})});assert.equal(saved.status,200);
 const settingsResponse=await mf.dispatchFetch('https://api.vantanoir.store/api/store-settings');const publicSettings=await settingsResponse.json();assert.equal(publicSettings.hero.title,'Test campaign');assert.deepEqual(publicSettings.aboutImage,stagedSettings.aboutImage);assert.equal(publicSettings.hero.image,'/images/vanta-hero.png');assert.deepEqual(publicSettings.internationalZones,[]);assert.equal(publicSettings.internationalDutiesNote,'');
 const admin=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/orders',{headers:authHeaders});assert.equal(admin.status,200);assert.deepEqual((await admin.json()).orders,[]);
 const pageStarted=performance.now(); const adminPage=await mf.dispatchFetch('https://api.vantanoir.store/admin',{headers:{...authHeaders,Accept:'text/html'}});assert.equal(adminPage.status,200);const html=await adminPage.text();console.log(`Admin HTML: ${Math.round(performance.now()-pageStarted)} ms, ${Buffer.byteLength(html)} bytes`);assert.match(html,/Your workspace is getting ready/);assert.ok(Buffer.byteLength(html)<150_000,"Admin HTML must not embed the full catalogue");assert.match(html,/Presence. Power. Precision./);assert.doesNotMatch(html,/signin-with-chatgpt|codex-preview/);
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
 // Inventory writes and confirmations are exercised only in this isolated test database.
 const stockBefore=await (await mf.dispatchFetch('https://api.vantanoir.store/api/admin/inventory',{headers:authHeaders})).json();
 const stockRow=stockBefore.inventory.find(r=>r.active&&r.productStatus==='published');
 assert.equal(stockRow.reserved,0);assert.equal(stockRow.available,0);
 const stockHeaders={...authHeaders,'Content-Type':'application/json'};
 const stockWrite=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/inventory',{method:'PATCH',headers:stockHeaders,body:JSON.stringify({variantId:stockRow.id,expectedStock:0,stock:8})});
 assert.equal(stockWrite.status,200);const stockSaved=await stockWrite.json();assert.equal(stockSaved.row.stock,8);assert.equal(stockSaved.row.available,8);
 const staleWrite=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/inventory',{method:'PATCH',headers:stockHeaders,body:JSON.stringify({variantId:stockRow.id,expectedStock:0,stock:2})});assert.equal(staleWrite.status,409);
 const invalidStock=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/inventory',{method:'PATCH',headers:stockHeaders,body:JSON.stringify({variantId:stockRow.id,expectedStock:8,stock:''})});assert.equal(invalidStock.status,400);
 const history=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/operations?resource=inventory&q='+encodeURIComponent(stockRow.productName),{headers:authHeaders});assert.equal(history.status,200);const historyRows=(await history.json()).rows;assert.ok(historyRows.some(r=>r.variant_id===stockRow.id&&r.new_stock===8&&r.color===stockRow.color&&r.size===stockRow.size));

 // Dashboard comparisons and management tools use isolated fixtures, never live orders.
 const fixtureDates=['2026-09-01','2026-08-31','2026-09-01','2026-09-01','2026-09-02'];
 for(let i=0;i<fixtureDates.length;i++)await db.prepare(`INSERT INTO orders(id,reference,email,first_name,last_name,phone,address_line_1,city,state,subtotal_kobo,total_kobo,status,payment_status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind('dashboard-'+i,'VN-DASH-'+i,'customer@example.com','Test','Customer','0000','Test address','Kaduna','Kaduna',(i+1)*10000,(i+1)*10000,i===2?'cancelled':i===3?'pending_payment':'paid',i===3?'pending':'paid',fixtureDates[i]+' 12:00:00').run();
 for(let i=0;i<2;i++)await db.prepare(`INSERT INTO order_items(order_id,product_id,variant_id,product_name,size,color,quantity,unit_price_kobo,line_total_kobo) VALUES(?,?,?,?,?,?,?,?,?)`).bind('dashboard-'+i,stockRow.productId,stockRow.id,stockRow.productName,stockRow.size,stockRow.color,1,(i+1)*10000,(i+1)*10000).run();
 const report=await (await mf.dispatchFetch('https://api.vantanoir.store/api/admin/analytics?from=2026-09-01&to=2026-09-01',{headers:authHeaders})).json();
 assert.equal(report.analytics.trend.length,1);assert.equal(report.analytics.trend[0].orders,1);assert.equal(report.analytics.trend[0].revenueKobo,10000);assert.equal(report.analytics.trend[0].previousOrders,1);assert.equal(report.analytics.trend[0].previousRevenueKobo,20000);assert.equal(report.analytics.bestSellers[0].units,1);assert.equal(report.analytics.conversion.status,'not_configured');assert.equal(report.analytics.conversion.current,null);
 assert.equal((await mf.dispatchFetch('https://api.vantanoir.store/api/admin/analytics?from=2026-02-30&to=2026-03-01',{headers:authHeaders})).status,400);
 assert.equal((await mf.dispatchFetch('https://api.vantanoir.store/api/admin/management')).status,403);
 const management=async query=>{const r=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/management?'+query,{headers:authHeaders});assert.equal(r.status,200,query+': '+r.status);assert.equal(r.headers.get('Cache-Control'),'no-store');return r.json();};
 const attention=await management('resource=attention');assert.equal(attention.orders.find(r=>r.status==='paid').count,3);assert.equal(attention.lowStockThreshold,3);
 const searched=await management('resource=search&q=VN-DASH-0');assert.equal(searched.orders.length,1);assert.equal(searched.orders[0].reference,'VN-DASH-0');assert.equal((await management('resource=search&q=%25')).orders.length,0,'SQL wildcard is treated as literal search text');
 const customers=await management('resource=customers&q=customer');assert.equal(customers.customers.length,1);assert.equal(customers.customers[0].orders,5);assert.equal(customers.customers[0].paidOrders,3);assert.equal(customers.customers[0].paidKobo,80000);
 const exactCustomer=await (await mf.dispatchFetch('https://api.vantanoir.store/api/admin/orders?customerEmail=stomer%40example.com&query=stomer%40example.com',{headers:authHeaders})).json();assert.equal(exactCustomer.total,0,'Customer history matches an exact email, not a substring');
 const ready=await (await mf.dispatchFetch('https://api.vantanoir.store/api/admin/orders?status=fulfil',{headers:authHeaders})).json();assert.equal(ready.total,3);assert.ok(ready.orders.every(o=>o.paymentStatus==='paid'&&['paid','processing'].includes(o.status)));
 const artwork=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/management',{method:'PATCH',headers:stockHeaders,body:JSON.stringify({campaignProductId:stockRow.productId})});assert.equal(artwork.status,200);assert.equal((await management('resource=attention')).campaignProductId,stockRow.productId);
 for(const resource of ['search','attention','customers','integrations']){
  await db.prepare("INSERT OR REPLACE INTO admin_staff(email,role,active) VALUES('limited@example.com','analyst',1)").run();
  const limited=await new SignJWT({email:'limited@example.com'}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setIssuer(issuer).setAudience('release-aud').setIssuedAt().setExpirationTime('10m').sign(privateKey);
  assert.equal((await mf.dispatchFetch('https://api.vantanoir.store/api/admin/management?resource='+resource,{headers:{...authHeaders,'cf-access-jwt-assertion':limited}})).status,403,'Management customer data stays owner-only');
 }
 console.log('Dashboard checks passed: date boundaries, comparisons, cancelled/unpaid exclusion, GA4 state, escaped search, customer history, fulfilment filters, artwork persistence, staff permissions.');
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
