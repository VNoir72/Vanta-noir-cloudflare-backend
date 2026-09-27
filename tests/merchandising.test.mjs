import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';
import {mkdir,readdir,readFile} from 'node:fs/promises';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';

const bundled=await build({entryPoints:['lib/merchandising.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const logic=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const now=Date.parse('2026-09-26T12:00:00Z');
const product={id:'p',name:'A piece',slug:'a-piece',details:{availability:'in_stock',priceStatus:'approved',releaseDate:'2026-09-20'},colorways:[{name:'Black',stock:{M:2,L:1}}]};
test('new arrivals use explicit valid release dates, never import timestamps or previews',()=>{
 assert.equal(logic.isNewArrival(product,now),true);
 for(const date of ['', '2026-09-27','2026-08-01','invalid'])assert.equal(logic.isNewArrival({...product,details:{...product.details,releaseDate:date}},now),false);
 assert.equal(logic.isNewArrival({...product,details:{...product.details,availability:'preview'}},now),false);
 assert.equal(logic.isNewArrival({...product,details:{...product.details,priceStatus:'proposed'}},now),false);
});
test('best sellers, selling fast and low stock require real thresholds and exact variants',()=>{
 const data={sales:[{productId:'p',units30:8,orders30:4,units7:5,orders7:3}],stockBadgesEnabled:true};
 assert.equal(logic.homepageSections([product],data,now).bestSellers.length,1);
 assert.equal(logic.homepageSections([product],{sales:[],stockBadgesEnabled:false},now).bestSellers.length,0);
 assert.equal(logic.homepageSections([product],{...data,sales:[{...data.sales[0],orders30:1}]},now).bestSellers.length,0);
 assert.equal(logic.sellingFast(product,data),true);
 assert.equal(logic.sellingFast(product,{...data,stockBadgesEnabled:false}),false);
 assert.equal(logic.sellingFast({...product,colorways:[{stock:{M:100}}]},data),false);
 assert.equal(logic.sellingFast({...product,details:{...product.details,availability:'preorder'}},data),false);
 assert.match(logic.lowStockMessage(product,'M',2,true),/Only 2 left in M for this colour/);
 assert.equal(logic.homepageStockBadge(product,data),'Low stock · 3 left across sizes');
 assert.equal(logic.homepageStockBadge(product,{...data,stockBadgesEnabled:false}),'');
 for(const [size,stock,enabled] of [['M',0,true],['M',4,true],['M',2,false],['',2,true],['Size pending',2,true]])assert.equal(logic.lowStockMessage(product,size,stock,enabled),'');
});
test('homepage lists are deterministic, bounded and distinguish featured from best sellers',()=>{
 const p=Array.from({length:12},(_,i)=>({...product,id:String(i).padStart(2,'0'),featured:i<2}));
 const s=logic.homepageSections(p,logic.EMPTY_MERCHANDISING,now);
 assert.equal(s.featured.length,2);assert.equal(s.newArrivals.length,8);assert.equal(s.bestSellers.length,0);assert.equal(s.comingSoon.length,0);
 assert.equal(logic.homepageSections(p.map(x=>({...x,details:{...x.details,availability:'preview'}})),logic.EMPTY_MERCHANDISING,now).comingSoon.length,8);
});

test('release integration: live payment evidence, refunds, opt-in, authorisation, campaigns and queued unsubscribe',async()=>{
 await mkdir('work',{recursive:true});
 await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/releases-test-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const {publicKey,privateKey}=await generateKeyPair('RS256'),issuer='https://releases-test.cloudflareaccess.com';
 const jwk={...await exportJWK(publicKey),kid:'release',alg:'RS256',use:'sig'};
 const token=await new SignJWT({email:'owner@example.com'}).setProtectedHeader({alg:'RS256',kid:'release'}).setIssuer(issuer).setAudience('releases').setIssuedAt().setExpirationTime('10m').sign(privateKey);
 const sent=[];
 const mf=new Miniflare({modules:true,scriptPath:'work/releases-test-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{ADMIN_EMAIL:'owner@example.com',AUTH_PROVIDER:'cloudflare-access',CF_ACCESS_TEAM_DOMAIN:issuer,CF_ACCESS_AUD:'releases',PAYSTACK_SECRET_KEY:'sk_test_local',RESEND_API_KEY:'re_local',EMAIL_FROM:'Vanta Noir <test@example.com>',STOREFRONT_URL:'https://vantanoir.store'},outboundService:async request=>{
  if(request.url===issuer+'/cdn-cgi/access/certs')return Response.json({keys:[jwk]});
  assert.equal(request.url,'https://api.resend.com/emails');sent.push(await request.json());return Response.json({id:crypto.randomUUID()});
 }});
 try {
  const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(x=>x.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  const rpc=async(action,...args)=>{const r=await mf.dispatchFetch('https://api.vantanoir.store/test',{method:'POST',body:JSON.stringify({action,args})});const d=await r.json();assert.equal(r.status,200,JSON.stringify(d));return d;};
  let address=0;
  const request=(path,body,owner=false,origin='https://api.vantanoir.store')=>mf.dispatchFetch('https://api.vantanoir.store'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Origin:origin,'cf-connecting-ip':String(++address),...(owner?{'cf-access-jwt-assertion':token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const p=(await rpc('listCatalog'))[0],variantId=Object.values(p.colorways[0].variantIds)[0];
  await rpc('sql','UPDATE product_variants SET stock=50 WHERE id=?',variantId);
  const settings={supportEmail:'care@example.com',acceptingOrders:true,inventoryConfirmed:true,dispatchNote:'Test dispatch',returnPolicy:'Test policy only',shippingZones:[{state:'Lagos',feeKobo:100000,estimate:'Test delivery'}]};
  await rpc('saveCommerceSettings',settings);
  const customer={email:'buyer@example.com',firstName:'Test',lastName:'Buyer',phone:'08000000000',addressLine1:'10 Test Street',addressLine2:'',city:'Ikeja',state:'Lagos'};
  const order=async(domain,qty=2)=>{const o=await rpc('createPendingOrder',{customer,cart:[{variantId,quantity:qty}],shippingKobo:100000,expectedTotalKobo:p.priceKobo*qty+100000});await rpc('markOrderPaid',{reference:o.reference,amountKobo:o.totalKobo,eventKey:'verify:'+o.reference,eventType:'verify.success',...(domain?{paymentDomain:domain}:{})});return o;};
  await order('test');await order(undefined);
  assert.deepEqual(await rpc('salesSignals'),[],'Test and unknown historical payments never become public sales');
  const a=await order('live'),b=await order('live'),c=await order('live');
  let signal=(await rpc('salesSignals'))[0];assert.equal(signal.units30,6);assert.equal(signal.orders30,3);
  await rpc('markOrderPaid',{reference:a.reference,amountKobo:a.totalKobo,eventKey:'webhook:duplicate',eventType:'charge.success',paymentDomain:'live'});
  assert.equal((await rpc('salesSignals'))[0].units30,6,'Repeated payment notification does not increase sales');
  const ai=(await rpc('sql','SELECT id FROM order_items WHERE order_id=?',a.id)).results[0];
  await rpc('sql',"INSERT INTO return_requests(id,order_id,kind,reason,items_json,refund_status,refund_kobo) VALUES ('return-a',?,'return','test',?,'completed',1000)",a.id,JSON.stringify([{id:ai.id,quantity:1}]));
  assert.equal((await rpc('salesSignals'))[0].units30,5,'Partial refund deducts only selected quantities');
  await rpc('sql',"UPDATE orders SET status='cancelled' WHERE id=?",b.id);
  assert.equal((await rpc('salesSignals'))[0].units30,3);
  await rpc('sql',"UPDATE orders SET paid_at=datetime('now','-31 days') WHERE id=?",c.id);
  assert.equal((await rpc('salesSignals'))[0].units30,1);
  const catalog=await (await request('/api/catalog')).json();assert.equal(catalog.merchandising.stockBadgesEnabled,true);assert.ok(!JSON.stringify(catalog.merchandising).includes('buyer@example.com'));
  assert.equal((await request('/api/admin/releases',{productId:p.id,confirmed:true})).status,403);
  assert.equal((await request('/api/admin/releases',{productId:p.id,confirmed:true},true,'https://evil.example')).status,403);
  assert.equal((await request('/api/admin/releases',{productId:p.id,confirmed:false},true)).status,400);
  assert.equal((await request('/api/subscriptions',{email:'invalid',kind:'release',productId:p.id,consent:true})).status,400);
  assert.equal((await request('/api/subscriptions',{email:'no-consent@example.com',kind:'release',productId:p.id,consent:false})).status,400);
  assert.equal((await request('/api/subscriptions',{email:'missing@example.com',kind:'release',productId:'not-a-product',consent:true})).status,400);
  async function subscribe(email,kind='release',productId=p.id,confirm=true) {
   const response=await request('/api/subscriptions',{email,kind,productId,consent:true});assert.equal(response.status,200);
   const s=(await rpc('sql','SELECT * FROM subscribers WHERE email=? AND kind=?',email,kind)).results[0];
   if(confirm)assert.equal((await request('/api/subscriptions',{action:'confirm',token:s.token})).status,200);
   return s;
  }
  const optout=await subscribe('optout@example.com');
  await subscribe('pending@example.com','release',p.id,false);
  await subscribe('news@example.com','newsletter');
  await subscribe('news@example.com'); // One address on both lists still gets just one email.
  const other=(await rpc('listCatalog'))[1];await subscribe('other@example.com','release',other.id);
  await rpc('saveCommerceSettings',{...settings,acceptingOrders:false});
  assert.equal((await request('/api/admin/releases',{productId:p.id,confirmed:true},true)).status,400);
  assert.equal((await (await request('/api/catalog')).json()).merchandising.stockBadgesEnabled,false);
  await rpc('saveCommerceSettings',settings);
  assert.equal((await request('/api/admin/releases',{productId:p.id,confirmed:true},true)).status,200);
  assert.equal((await (await request('/api/admin/releases',{productId:p.id,confirmed:true},true)).json()).created,false);
  await Promise.all([rpc('queueReleaseAlerts'),rpc('queueReleaseAlerts')]);
  let queued=(await rpc('sql',"SELECT * FROM email_outbox WHERE event_key LIKE '%:release:%'")).results;
  assert.equal(queued.length,2,'Confirmed newsletter and product audiences only, deduplicated across lists and concurrent workers');
  await request('/api/subscriptions',{action:'unsubscribe',token:optout.token});
  await rpc('saveCommerceSettings',{...settings,acceptingOrders:false});
  await rpc('processEmailOutbox',100);
  assert.equal(sent.filter(x=>x.subject.startsWith('Just released:')).length,0,'Pausing the store holds release messages even after queueing');
  await rpc('saveCommerceSettings',settings);
  await rpc('sql',"UPDATE email_outbox SET next_attempt_at=CURRENT_TIMESTAMP WHERE event_key LIKE '%:release:%'");
  await rpc('processEmailOutbox',100);
  assert.equal(sent.filter(x=>x.subject.startsWith('Just released:')).length,1);
  assert.deepEqual(sent.filter(x=>x.subject.startsWith('Just released:'))[0].to,['news@example.com']);
  assert.ok(sent.find(x=>x.subject.startsWith('Just released:')).text.includes('Unsubscribe:'));
  await rpc('queueReleaseAlerts');await rpc('processEmailOutbox',100);
  assert.equal(sent.filter(x=>x.subject.startsWith('Just released:')).length,1,'Repeat processing never resends');
  const archived=await rpc('sql',"UPDATE products SET status='archived',active=0 WHERE id=?",other.id);
  assert.equal((await request('/api/admin/releases',{productId:other.id,confirmed:true},true)).status,400);
  // Larger audiences are drained over bounded batches, never dropped or resent.
  await rpc('sql',"UPDATE products SET status='published',active=1 WHERE id=?",other.id);
  const otherVariant=Object.values(other.colorways[0].variantIds)[0];await rpc('sql','UPDATE product_variants SET stock=10 WHERE id=?',otherVariant);
  for(let i=0;i<12;i++)await subscribe(`batch-${i}@example.com`,'newsletter');
  assert.equal((await request('/api/admin/releases',{productId:other.id,confirmed:true},true)).status,200);
  const campaigns=await rpc('releaseCampaigns'),drop=campaigns.find(c=>c.productId===other.id);
  await subscribe('late@example.com','newsletter');await rpc('sql',"UPDATE subscribers SET updated_at=datetime(?,'+1 minute') WHERE email='late@example.com'",drop.startedAt);
  const count=async()=>Number((await rpc('sql','SELECT COUNT(*) AS n FROM email_outbox WHERE instr(event_key,?)>0',':release:'+drop.id+':')).results[0].n);
  await rpc('queueReleaseAlerts');assert.equal(await count(),10);
  await rpc('queueReleaseAlerts');assert.equal(await count(),14);
  await rpc('queueReleaseAlerts');assert.equal(await count(),14);
  assert.ok((await rpc('releaseCampaigns')).find(c=>c.id===drop.id).completedAt);
  assert.equal((await rpc('sql',"SELECT COUNT(*) AS n FROM email_outbox WHERE recipient='late@example.com' AND event_key LIKE '%:release:%'")).results[0].n,0,'New subscribers do not receive old announcements');
 } finally {await mf.dispose();}
});

test('best seller ranks count verified units once per source product across grouped colours',()=>{
 const a={...product,id:'a',colorways:[{sourceProductId:'a'},{sourceProductId:'b'},{sourceProductId:'b'}]};
 const b={...product,id:'c',colorways:[]};
 const data={sales:[{productId:'a',units30:2},{productId:'b',units30:5},{productId:'c',units30:6}],stockBadgesEnabled:false};
 assert.equal(logic.bestSellerUnits(a,data),7);
 assert.equal(logic.bestSellerUnits(b,data),6);
 assert.deepEqual([b,a].sort((x,y)=>logic.bestSellerUnits(y,data)-logic.bestSellerUnits(x,data)).map(p=>p.id),['a','c']);
 assert.equal(logic.bestSellerUnits(a,logic.EMPTY_MERCHANDISING),0);
});
