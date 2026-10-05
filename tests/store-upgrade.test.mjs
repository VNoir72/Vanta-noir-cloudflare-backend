import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';
import {mkdir,readdir,readFile} from 'node:fs/promises';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
async function load(path){const r=await build({entryPoints:[path],bundle:true,write:false,platform:'node',format:'esm'});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));}
const config=await load('lib/commerce-config.ts'),address=await load('lib/checkout-address.ts'),images=await load('lib/image-signature.ts'),labels=await load('lib/catalog-search.ts');
test('international rollout is opt-in, redacts staged data and never uses Nigerian fallback fees',()=>{
 const base=config.defaultCommerceSettings();assert.equal(base.internationalEnabled,false);
 const staged=config.commerceSettingsSchema.parse({...base,internationalZones:[{countryCode:'GB',feeKobo:5000000,estimate:'Test window'}],internationalDutiesNote:'Buyer pays import charges.'});
 assert.deepEqual(config.publicCommerceSettings(staged).internationalZones,[]);
 assert.equal(config.publicCommerceSettings(staged).internationalDutiesNote,'');
 assert.equal(config.shippingQuote({...staged,shippingFeeKobo:0},'London','GB').feeKobo,null);
 const live={...staged,internationalEnabled:true};assert.equal(config.shippingQuote(live,'','GB').feeKobo,5000000);
 assert.equal(config.shippingQuote({...live,shippingFeeKobo:0},'California','US').feeKobo,null);
 for(const patch of [{internationalEnabled:true},{internationalZones:[...staged.internationalZones,...staged.internationalZones]},{internationalZones:[{countryCode:'NG',feeKobo:1,estimate:'test'}]},{internationalZones:[{countryCode:'GB',feeKobo:-1,estimate:'test'}]}])assert.equal(config.commerceSettingsSchema.safeParse({...base,...patch}).success,false);
});
test('hero rejects external trackers, executable links and traversal; collection aliases preserve identity',()=>{
 for(const image of ['https://evil.example/a.jpg','/images/../private.png','data:image/png;base64,xx'])assert.equal(config.commerceSettingsSchema.safeParse({hero:{image}}).success,false);
 for(const buttonLink of ['javascript:alert(1)','//evil.example','/\\evil.example'])assert.equal(config.commerceSettingsSchema.safeParse({hero:{buttonLink}}).success,false);
 assert.equal(config.commerceSettingsSchema.parse({hero:{mobileImage:'/images/test.webp',showText:false}}).hero.showText,false);
 assert.equal(labels.shopperCollectionLabel('Batch 04 — Mens Denim'),'Men’s Denim');
 assert.equal(labels.shopperCollectionLabel('Batch 04 — Mens Denim',[{source:'Batch 04 — Mens Denim',label:'Noir Denim'}]),'Noir Denim');
 assert.equal(labels.shopperCollectionLabel('Batch 001'),'Collection');
});
test('checkout validates country, required postal codes, domestic states and bounded addresses',()=>{
 const buyer={email:'test@example.com',firstName:'Test',lastName:'Buyer',phone:'+447000000000',addressLine1:'10 Test Street',city:'London',countryCode:'GB',state:'',postalCode:'SW1A 1AA'};
 assert.equal(address.checkoutCustomerSchema.safeParse(buyer).success,true);
 assert.equal(address.checkoutCustomerSchema.safeParse({...buyer,postalCode:''}).success,false);
 assert.equal(address.checkoutCustomerSchema.safeParse({...buyer,countryCode:'ZZ'}).success,false);
 assert.equal(address.checkoutCustomerSchema.safeParse({...buyer,countryCode:'NG'}).success,false);
 assert.equal(address.checkoutCustomerSchema.safeParse({...buyer,countryCode:'NG',state:'Lagos',postalCode:''}).success,true);
 assert.equal(address.checkoutCustomerSchema.safeParse({...buyer,countryCode:'AE',postalCode:''}).success,true);
 assert.equal(address.addressLineWithPostalCode({addressLine2:'Flat 3',postalCode:'SW1A 1AA'}),'Flat 3\nPostal code: SW1A 1AA');
});
test('image uploads check content signatures, not just supplied MIME labels',()=>{
 assert.equal(images.matchesImageSignature(new TextEncoder().encode('<html><script>alert(1)</script>'),'image/png'),false);
 assert.equal(images.matchesImageSignature(Uint8Array.from([137,80,78,71,13,10,26,10]),'image/png'),true);
 assert.equal(images.matchesImageSignature(Uint8Array.from([255,216,255,0]),'image/jpeg'),true);
 assert.equal(images.matchesImageSignature(new TextEncoder().encode('RIFF0000WEBP'),'image/webp'),true);
 assert.equal(images.matchesImageSignature(new TextEncoder().encode('0000ftypavif0000'),'image/avif'),true);
 assert.equal(images.matchesImageSignature(new Uint8Array(),'image/png'),false);
});
test('integration: rollout switch, private receipts, admin authorization, address persistence and upload checks',async()=>{
 await mkdir('work',{recursive:true});await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/upgrade-test-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const {publicKey,privateKey}=await generateKeyPair('RS256'),issuer='https://upgrade-test.cloudflareaccess.com',jwk={...await exportJWK(publicKey),kid:'upgrade',alg:'RS256',use:'sig'};
 const token=await new SignJWT({email:'owner@example.com'}).setProtectedHeader({alg:'RS256',kid:'upgrade'}).setIssuer(issuer).setAudience('upgrade').setIssuedAt().setExpirationTime('10m').sign(privateKey);
 let paymentCalls=0;
 const mf=new Miniflare({modules:true,scriptPath:'work/upgrade-test-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{ADMIN_EMAIL:'owner@example.com',AUTH_PROVIDER:'cloudflare-access',CF_ACCESS_TEAM_DOMAIN:issuer,CF_ACCESS_AUD:'upgrade',PAYSTACK_SECRET_KEY:'sk_test_local',STOREFRONT_URL:'https://vantanoir.store'},outboundService:async request=>{
  if(request.url===issuer+'/cdn-cgi/access/certs')return Response.json({keys:[jwk]});
  assert.equal(request.url,'https://api.paystack.co/transaction/initialize');paymentCalls++;const body=await request.json();return Response.json({status:true,data:{authorization_url:'https://checkout.paystack.com/local-test',reference:body.reference}});
 }});
 try {
  const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(x=>x.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  const rpc=async(action,...args)=>{const r=await mf.dispatchFetch('https://api.vantanoir.store/test',{method:'POST',body:JSON.stringify({action,args})});const d=await r.json();assert.equal(r.status,200,JSON.stringify(d));return d;};
  let ip=0;const request=(path,body,owner=false,extra={})=>mf.dispatchFetch('https://api.vantanoir.store'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Origin:'https://api.vantanoir.store','cf-connecting-ip':String(++ip),...(owner?{'cf-access-jwt-assertion':token}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
  const p=(await rpc('listCatalog'))[0],variantId=Object.values(p.colorways[0].variantIds)[0];await rpc('sql','UPDATE product_variants SET stock=20 WHERE id=?',variantId);
  let settings=config.commerceSettingsSchema.parse({supportEmail:'care@example.com',acceptingOrders:true,inventoryConfirmed:true,dispatchNote:'Test dispatch',returnPolicy:'Test policy only',shippingZones:[{state:'Lagos',feeKobo:100000,estimate:'Test domestic window'}],internationalZones:[{countryCode:'GB',feeKobo:5000000,estimate:'Test international window'}],internationalDutiesNote:'Buyer pays import charges.',hero:{title:'A new campaign'}});
  assert.equal((await request('/api/admin/commerce',{action:'settings',settings})).status,403);
  assert.equal((await request('/api/admin/commerce',{action:'settings',settings},true,{Origin:'https://evil.example'})).status,403);
  assert.equal((await request('/api/admin/commerce',{action:'settings',settings},true)).status,200);
  let publicSettings=await (await request('/api/store-settings')).json();assert.equal(publicSettings.hero.title,'A new campaign');assert.deepEqual(publicSettings.internationalZones,[]);
  assert.deepEqual((await (await request('/api/catalog')).json()).checkout.internationalZones,[]);
  const customer={email:'private-buyer@example.com',firstName:'Test',lastName:'Buyer',phone:'+447000000000',addressLine1:'10 Private Street',addressLine2:'Flat 3',city:'London',state:'',countryCode:'GB',postalCode:'SW1A 1AA'};
  const checkout={customer,cart:[{variantId,quantity:1}],expectedTotalKobo:p.priceKobo+5000000};
  assert.equal((await request('/api/checkout',checkout)).status,400);assert.equal(paymentCalls,0);
  settings={...settings,internationalEnabled:true};assert.equal((await request('/api/admin/commerce',{action:'settings',settings},true)).status,200);
  assert.equal((await (await request('/api/store-settings')).json()).internationalZones.length,1);
  assert.equal((await request('/api/checkout',{...checkout,expectedTotalKobo:p.priceKobo+100000})).status,400);
  assert.equal((await request('/api/checkout',{...checkout,customer:{...customer,countryCode:'US'}})).status,400);
  const created=await request('/api/checkout',checkout);assert.equal(created.status,200);const order=await created.json();assert.equal(order.receiptToken.length,73);assert.equal(paymentCalls,1);
  const stored=(await rpc('sql','SELECT country,address_line_2 AS extra FROM orders WHERE reference=?',order.reference)).results[0];assert.equal(stored.country,'United Kingdom');assert.match(stored.extra,/Flat 3\nPostal code: SW1A 1AA/);
  await rpc('markOrderPaid',{reference:order.reference,amountKobo:checkout.expectedTotalKobo,eventKey:'test:'+order.reference,eventType:'test',paymentDomain:'test'});
  const email=(await rpc('sql','SELECT body FROM email_outbox WHERE event_key=?',`order:${order.reference}:payment`)).results[0];assert.match(email.body,/United Kingdom/);assert.match(email.body,/SW1A 1AA/);
  assert.equal((await rpc('listAdminOrders'))[0].country,'United Kingdom');
  // Bounded adversarial burst against isolated Miniflare, never the live store.
  const deniedBurst=await Promise.all(Array.from({length:40},()=>request('/api/admin/orders',null,false)));
  assert.ok(deniedBurst.every(r=>r.status===403),'unauthorized burst must remain denied');
  const malformed=await Promise.all(['{',JSON.stringify({reference:order.reference,status:'delivered',expectedStatus:'__proto__'}),JSON.stringify({reference:order.reference,status:'<script>alert(1)</script>'})].map(body=>mf.dispatchFetch('https://api.vantanoir.store/api/admin/orders',{method:'PATCH',headers:{Origin:'https://api.vantanoir.store','cf-access-jwt-assertion':token,'Content-Type':'application/json'},body})));
  assert.ok(malformed.every(r=>r.status===400),'malformed updates must return controlled errors');
  const change=async(status,expectedStatus,bulkVerified=true,authorized=true)=>mf.dispatchFetch('https://api.vantanoir.store/api/admin/orders',{method:'PATCH',headers:{'Content-Type':'application/json',Origin:'https://api.vantanoir.store',...(authorized?{'cf-access-jwt-assertion':token}:{})},body:JSON.stringify({reference:order.reference,status,expectedStatus,...(bulkVerified?{bulkVerified:true}:{})})});
  assert.equal((await change('processing','paid',true,false)).status,403);
  assert.equal((await change('delivered','paid')).status,409);
  assert.equal((await change('processing','paid',false)).status,409);
  const concurrent=await Promise.all(Array.from({length:8},()=>change('processing','paid')));
  assert.equal(concurrent.filter(r=>r.status===200).length,1,'only one concurrent status update may succeed');
  assert.ok(concurrent.every(r=>[200,409].includes(r.status)));
  assert.equal((await change('shipped','processing')).status,409,'tracking must be saved first');
  await rpc('updateOrderTracking',order.reference,{carrier:'Test carrier',trackingNumber:'TEST-ONLY',trackingUrl:'',deliveryEstimate:''});
  assert.equal((await change('shipped','processing')).status,200);
  assert.equal((await change('delivered','shipped')).status,200);
  assert.equal((await change('processing','paid')).status,409,'delivered cannot move backwards');
  const guestAfterBulk=await rpc('getGuestOrder',order.reference,customer.email,'');assert.equal(guestAfterBulk.status,'delivered');
  const path='/api/payments/verify?reference='+order.reference;
  assert.equal((await request(path)).status,403);
  assert.equal((await request(path,null,false,{'X-Receipt-Token':crypto.randomUUID()+'-'+crypto.randomUUID()})).status,403);
  const paid=await request(path,null,false,{'X-Receipt-Token':order.receiptToken});assert.equal(paid.status,200);const receipt=await paid.text();assert.ok(!receipt.includes(customer.email));assert.ok(!receipt.includes(customer.addressLine1));assert.ok(!receipt.includes('receiptToken'));assert.equal(paid.headers.get('X-Frame-Options'),'DENY');assert.equal(paid.headers.get('Cache-Control'),'no-store');
  const access=(await rpc('sql','SELECT value FROM store_meta WHERE key=?',`receipt-access:${order.reference}`)).results[0];assert.ok(!access.value.includes(order.receiptToken));
  await rpc('sql','UPDATE store_meta SET value=? WHERE key=?',JSON.stringify({...JSON.parse(access.value),expires:0}),`receipt-access:${order.reference}`);assert.equal((await request(path,null,false,{'X-Receipt-Token':order.receiptToken})).status,403);
  assert.equal(await rpc('getGuestOrder',order.reference,'another@example.com',''),null);assert.ok(await rpc('getGuestOrder',order.reference,customer.email,''));
  assert.equal((await request('/api/admin/commerce',{action:'settings',settings:{...settings,internationalEnabled:false}},true)).status,200);assert.equal((await request('/api/checkout',checkout)).status,400);
  const form=new FormData();form.set('file',new File(['<html>not an image</html>'],'fake.png',{type:'image/png'}));const upload=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/uploads',{method:'POST',headers:{Origin:'https://api.vantanoir.store','cf-access-jwt-assertion':token},body:form});assert.equal(upload.status,400);assert.equal((await (await mf.getR2Bucket('BUCKET')).list()).objects.length,0);

  // Real storage -> product -> public catalogue -> archive -> delete lifecycle.
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  const uploadFile=async(bytes,type='image/png',authorized=true)=>{const body=new FormData();body.set('file',new File([bytes],'front.png',{type}));const req=new Request('https://api.vantanoir.store/api/admin/uploads',{method:'POST',headers:{Origin:'https://api.vantanoir.store',...(authorized?{'cf-access-jwt-assertion':token}:{})},body});return mf.dispatchFetch(req.url,{method:'POST',headers:Object.fromEntries(req.headers),body:new Uint8Array(await req.arrayBuffer())});};
  assert.equal((await uploadFile(png,'image/png',false)).status,403);
  for(const [bytes,type] of [[new Uint8Array(),'image/png'],[png,'text/html'],[new Uint8Array(12*1024*1024+1),'image/png']])assert.equal((await uploadFile(bytes,type)).status,400);
  const uploaded=await uploadFile(png);assert.equal(uploaded.status,201,await uploaded.clone().text());const {url:imageUrl}=await uploaded.json();assert.match(imageUrl,/\/api\/media\/products\/[a-f0-9-]+\.png$/);
  const served=await mf.dispatchFetch(imageUrl);assert.equal(served.status,200);assert.equal(served.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await served.arrayBuffer()),png);
  assert.equal((await mf.dispatchFetch(imageUrl,{headers:{'if-none-match':served.headers.get('etag')}})).status,304);
  assert.equal((await mf.dispatchFetch('https://api.vantanoir.store/api/media/approval-staging/private.png')).status,404);
  const mutate=(method,body)=>mf.dispatchFetch('https://api.vantanoir.store/api/admin/products',{method,headers:{Origin:'https://api.vantanoir.store','Content-Type':'application/json','cf-access-jwt-assertion':token},body:JSON.stringify(body)});
  const draft={name:'Upload lifecycle jacket',slug:'upload-lifecycle-jacket',description:'Isolated lifecycle test',category:'Outerwear',priceKobo:2500000,status:'draft',images:[{color:'Black',imageUrl,imageAlt:'Front view'}],variants:[{sku:'QA-UPLOAD-M',size:'M',color:'Black',colorHex:'#000000',stock:3}]};
  const createdProduct=await mutate('POST',draft);assert.equal(createdProduct.status,201,await createdProduct.clone().text());let item=(await createdProduct.json()).product;
  const visible=async()=> (await (await request('/api/catalog')).json()).products.find(p=>p.id===item.id);
  assert.equal(await visible(),undefined);
  for(const status of ['published','archived','draft','published']){assert.equal((await mutate('PATCH',{productId:item.id,status})).status,200);const shown=await visible();assert.equal(Boolean(shown),status==='published');if(shown){assert.equal(shown.images[0].imageUrl,imageUrl);assert.equal(shown.colorways[0].stock.M,3);}}
  item=(await rpc('listAdminProducts')).find(p=>p.id===item.id);
  const edited=await mutate('PATCH',{...item,images:[{color:'Black',imageUrl,imageAlt:'Replacement front'}],variants:item.variants.map(v=>({...v,stock:2,expectedStock:v.stock}))});assert.equal(edited.status,200,await edited.clone().text());assert.equal((await visible()).colorways[0].stock.M,2);assert.equal((await visible()).images[0].imageAlt,'Replacement front');
  for(const bad of [null,[],{}, {...draft,priceKobo:-1},{...draft,images:[{imageUrl:'javascript:alert(1)'}]},{...draft,variants:[{...draft.variants[0],stock:-1}]}])assert.equal((await mutate('POST',bad)).status,400);
  assert.equal((await mutate('DELETE',{productId:item.id})).status,200);assert.equal(await visible(),undefined);assert.equal((await rpc('listAdminProducts')).some(p=>p.id===item.id),false);
  assert.equal((await mutate('DELETE',{productId:p.id})).status,400,'Ordered products must preserve order history');
  settings={...settings,deliveryPolicy:'Delivery test policy\nTracking and delays',returnPolicy:'Return test policy\nExchanges and refunds'};
  assert.equal((await request('/api/admin/commerce',{action:'settings',settings},true)).status,200);
  const publishedPolicy=await (await request('/api/store-settings')).json();assert.equal(publishedPolicy.deliveryPolicy,settings.deliveryPolicy);assert.equal(publishedPolicy.returnPolicy,settings.returnPolicy);
 }finally{await mf.dispose();}
});
