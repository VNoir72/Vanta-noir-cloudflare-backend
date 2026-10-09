import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {Miniflare} from './miniflare.mjs';import {readdir,readFile} from 'node:fs/promises';
import {assertShippingProvider,shippingProviders} from '../lib/shipping-policy.ts';
test('Terminal selection is blocked independently of credentials',()=>{assert.equal(shippingProviders.terminal.selectable,false);assert.equal(shippingProviders.terminal.bookingEnabled,false);assert.throws(()=>assertShippingProvider('terminal'),/verification/);assertShippingProvider('shipbubble');});
test('Shipbubble checkout binds measured quotes to address, bag, rewards and authoritative payment totals',async t=>{
 await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/shipping-checkout.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 let calls=0,lastWeight=0;const mf=new Miniflare({modules:true,scriptPath:'work/shipping-checkout.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{SHIPBUBBLE_API_KEY:'sb_prod_fixture',SHIPBUBBLE_CHECKOUT_ENABLED:'true',TERMINAL_AFRICA_LIVE_SECRET_KEY:'NEVER-USE'},outboundService:async r=>{
 calls++;const u=new URL(r.url);assert.equal(u.hostname,'api.shipbubble.com');assert.equal(r.headers.get('Authorization'),'Bearer sb_prod_fixture');
 if(u.pathname.endsWith('/address/validate'))return Response.json({status:'success',data:{address_code:123}});
 if(u.pathname.endsWith('/labels/categories'))return Response.json({status:'success',data:[{category:'Fashion wears',category_id:987}]});
 assert.ok(u.pathname.endsWith('/fetch_rates'),'No booking or Terminal calls');const body=await r.json();assert.equal(body.service_type,'pickup');assert.ok(body.package_items[0].unit_weight>0);lastWeight=body.package_items[0].unit_weight;
 return Response.json({status:'success',data:{request_token:'test_token',couriers:[{service_code:'slow',courier_name:'Courier A',service_type:'pickup',currency:'NGN',total:1000,rate_card_amount:2000},{service_code:'fast',courier_name:'Courier B',service_type:'pickup',currency:'NGN',total:1500}]}});
 }});
 try{
 const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 const rpc=async(action,...args)=>{const r=await mf.dispatchFetch('https://api.example.com/test',{method:'POST',body:JSON.stringify({action,args})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
 const product=(await rpc('listCatalog'))[0],variantId=product.colorways[0].variantIds.S;
 await db.prepare('UPDATE product_variants SET stock=20 WHERE product_id=?').bind(product.id).run();
 const input={customer:{email:'buyer@example.com',firstName:'Test',lastName:'Buyer',phone:'08000000000',addressLine1:'10 Example Street',addressLine2:'',city:'Ikeja',state:'Lagos',countryCode:'NG',postalCode:'100001'},cart:[{variantId,quantity:1}],rewardCode:'',promotionCode:''};
 await db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?)').bind('terminal_business_pickup',JSON.stringify({details:{first_name:'Test',last_name:'Shop',email:'shop@example.com',phone:'08000000001',line1:'20 Example Street',line2:'',city:'Ikeja',state:'Lagos',country:'NG',zip:'100001'}})).run();
 await t.test('estimated profiles cannot become customer quotes',async()=>{await assert.rejects(rpc('createShippingQuotes',input),/being prepared/);assert.equal(calls,0);});
 await rpc('saveProductParcel',product.id,'S',{weightGrams:300,lengthCm:28,widthCm:23,heightCm:3,measured:true},null);
 await rpc('savePackaging',[{id:'measured',name:'Measured mailer',lengthCm:35,widthCm:30,heightCm:10,tareGrams:50,maxWeightGrams:2000,measured:true}],null);
 const quotes=await rpc('createShippingQuotes',input),selection={quoteId:quotes.quoteId,rateId:quotes.rates[0].rateId,provider:'shipbubble'};
 assert.equal(calls,4);assert.equal(quotes.rates[0].amountKobo,150000);assert.equal(quotes.rates[0].carrier,'Courier B');assert.ok(!JSON.stringify(quotes).includes('test_token'));
 const resolved=await rpc('resolveShippingSelection',selection,input);
 await t.test('changing address, bag, reward or provider invalidates selection',async()=>{
 for(const changed of [{...input,customer:{...input.customer,addressLine1:'99 Different Street'}},{...input,cart:[{variantId,quantity:2}]},{...input,rewardCode:'DIFFERENT'}])await assert.rejects(rpc('resolveShippingSelection',selection,changed),/changed or expired/);
 await assert.rejects(rpc('resolveShippingSelection',{...selection,provider:'terminal'},input),/verification/);
 await assert.rejects(rpc('resolveShippingSelection',{...selection,rateId:crypto.randomUUID()},input),/changed or expired/);
 });
 await t.test('payment totals and persisted fulfilment use the server rate',async()=>{
 const args={...input,checkoutAttempt:crypto.randomUUID()+'-'+crypto.randomUUID(),shippingKobo:resolved.rate.amountKobo,shippingQuote:resolved,expectedTotalKobo:product.priceKobo+resolved.rate.amountKobo,expectedRewardSignature:''};
 await assert.rejects(rpc('createPendingOrder',{...args,expectedTotalKobo:1}),/prices or delivery/);
 const order=await rpc('createPendingOrder',args);assert.equal(order.shippingKobo,150000);
 const record=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind('order-shipping:'+order.reference).first();assert.equal(JSON.parse(record.value).rate.provider,'shipbubble');assert.equal(JSON.parse(record.value).bookingStatus,'manual_confirmation_required');
 const expired={...resolved,expiresAt:0};await assert.rejects(rpc('createPendingOrder',{...args,checkoutAttempt:undefined,shippingQuote:expired}),/delivery quote changed/);
 assert.equal((await rpc('createPendingOrder',args)).reference,order.reference);
 });
 await t.test('Kaduna State customers pay zero while courier cost and destination binding remain intact',async()=>{
 const kaduna={...input,customer:{...input.customer,city:'Zaria',state:'Kaduna'}};
 const quotes=await rpc('createShippingQuotes',kaduna);assert.ok(quotes.rates.every(r=>r.amountKobo===0));
 const selected={quoteId:quotes.quoteId,rateId:quotes.rates[0].rateId,provider:'shipbubble'};
 const resolved=await rpc('resolveShippingSelection',selected,kaduna);assert.equal(resolved.rate.amountKobo,0);assert.equal(resolved.rate.walletKobo,150000);
 await assert.rejects(rpc('resolveShippingSelection',selected,input),/changed or expired/);
 const order=await rpc('createPendingOrder',{...kaduna,checkoutAttempt:crypto.randomUUID()+'-'+crypto.randomUUID(),shippingKobo:0,shippingQuote:resolved,expectedTotalKobo:product.priceKobo,expectedRewardSignature:''});assert.equal(order.shippingKobo,0);assert.equal(order.totalKobo,product.priceKobo);
 const outside=await rpc('createShippingQuotes',input);assert.ok(outside.rates.every(r=>r.amountKobo>0));
 });
 await t.test('expired quote is rejected and cannot be refreshed by the client',async()=>{await db.prepare("UPDATE store_meta SET value=json_set(value,'$.expiresAt',0) WHERE key=?").bind('shipping-quote:'+quotes.quoteId).run();await assert.rejects(rpc('resolveShippingSelection',{...selection,expiresAt:Date.now()+999999},input),/changed or expired/);});
 await t.test('owner-approved unmeasured weights work and edits invalidate old quotes',async()=>{
 const old=await rpc('productParcel',product.id,'S'),pack=await rpc('packagingProfiles');
 await rpc('saveProductParcel',product.id,'S',{weightGrams:400,lengthCm:28,widthCm:23,heightCm:3,measured:false},old.revision);
 await rpc('savePackaging',[{id:'approved',name:'Approved box',lengthCm:36,widthCm:25,heightCm:15,tareGrams:1760,boxGrams:1700,wrapGrams:60,maxWeightGrams:8000,measured:false}],pack.revision);
 const first=await rpc('createShippingQuotes',input);assert.equal(lastWeight,2.16);
 const firstSelection={quoteId:first.quoteId,rateId:first.rates[0].rateId,provider:'shipbubble'};
 const current=await rpc('productParcel',product.id,'S');assert.equal(current.parcel.measured,false);assert.equal(current.parcel.approvedForCheckout,true);
 await rpc('saveProductParcel',product.id,'S',{...current.parcel,weightGrams:600},current.revision);
 await assert.rejects(rpc('resolveShippingSelection',firstSelection,input),/changed or expired/);
 const expiredAllowed=await rpc('resolveShippingSelection',firstSelection,input,true);
 await assert.rejects(rpc('createPendingOrder',{...input,checkoutAttempt:crypto.randomUUID()+'-'+crypto.randomUUID(),shippingKobo:expiredAllowed.rate.amountKobo,shippingQuote:expiredAllowed,expectedTotalKobo:product.priceKobo+expiredAllowed.rate.amountKobo,expectedRewardSignature:''}),/changed or expired/);
 const fresh=await rpc('createShippingQuotes',input);assert.equal(lastWeight,2.36);
 const freshSelection={quoteId:fresh.quoteId,rateId:fresh.rates[0].rateId,provider:'shipbubble'},packs=await rpc('packagingProfiles');
 await rpc('savePackaging',[{...packs.data[0],tareGrams:1860,boxGrams:1800}],packs.revision);
 await assert.rejects(rpc('resolveShippingSelection',freshSelection,input),/changed or expired/);
 await rpc('createShippingQuotes',input);assert.equal(lastWeight,2.46);
 });
 }finally{await mf.dispose();}
});
