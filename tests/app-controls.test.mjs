import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {Miniflare} from './miniflare.mjs';import {mkdir,readdir,readFile} from 'node:fs/promises';import {randomUUID} from 'node:crypto';
test('app controls enforce release dates, account limits, channels and safe ordinary checkout',async()=>{
 await mkdir('work',{recursive:true});await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/app-controls-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 let pushFailure=false,pushBodies=[];
 const mf=new Miniflare({modules:true,scriptPath:'work/app-controls-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{ADMIN_EMAIL:'owner@example.com'},outboundService:async req=>{if(req.url.endsWith('/send')){const body=await req.json();pushBodies.push(body);if(pushFailure&&body[0]?.data?.appBenefits)throw Error('fixture optional alert outage');return Response.json({data:body.map((_,i)=>({status:'ok',id:'ticket-'+i}))});}if(req.url.endsWith('/getReceipts'))return Response.json({data:{}});throw Error('Unexpected external request');}});
 try{const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 const call=async(action,...args)=>{const r=await mf.dispatchFetch('https://api.example.com/test',{method:'POST',body:JSON.stringify({action,args})});return {status:r.status,data:await r.json()};};const rpc=async(action,...args)=>{const r=await call(action,...args);assert.equal(r.status,200,JSON.stringify(r.data));return r.data;};
 assert.equal((await mf.dispatchFetch('https://api.example.com/api/admin/app-controls')).status,403);
 const p=(await rpc('listCatalog'))[0],variantId=p.colorways[0].variantIds.S;await db.prepare('UPDATE product_variants SET stock=30 WHERE id=?').bind(variantId).run();
 const access={verifiedApp:true,customerId:'buyer',email:'buyer@example.com'},web={...access,verifiedApp:false};await db.prepare('INSERT INTO app_customers(id,email,created_at,terms_accepted_at) VALUES(?,?,?,?)').bind('buyer',access.email,Date.now(),Date.now()).run();
 const input=()=>({checkoutAttempt:randomUUID()+'-'+randomUUID(),customer:{email:access.email,firstName:'Test',lastName:'Buyer',phone:'08000000000',addressLine1:'Test address',addressLine2:'',city:'Lagos',state:'Lagos'},cart:[{variantId,quantity:1}],shippingKobo:0,expectedTotalKobo:p.priceKobo});
 const first=await rpc('createPendingOrder',input());assert.ok(first.reference);await rpc('restartPayment','wrong',first.reference).catch(()=>{});
 const past=new Date(Date.now()-60000).toISOString(),future=new Date(Date.now()+86400000).toISOString();
 let config=await rpc('saveAppControls',{enabled:true,drops:[{productId:p.id,title:'App test drop',mode:'early',startsAt:past,publicAt:future,perCustomer:1}]},'owner@example.com');
 assert.ok(!(await rpc('listCatalog')).some(x=>x.id===p.id));assert.ok((await rpc('listCatalog',access)).some(x=>x.id===p.id));
 assert.equal((await call('createPendingOrder',{...input(),appAccess:web})).status,400);
 const attempts=await Promise.all([call('createPendingOrder',{...input(),appAccess:access}),call('createPendingOrder',{...input(),appAccess:access})]);
 // Earlier guest order uses the same email and reserves stock, so it counts toward the per-customer limit.
 assert.equal(attempts.filter(x=>x.status===200).length,0);
 await db.prepare("UPDATE orders SET status='cancelled' WHERE id=?").bind(first.id).run();await db.prepare('DELETE FROM stock_reservations WHERE order_id=?').bind(first.id).run();
 const concurrent=await Promise.all([call('createPendingOrder',{...input(),appAccess:access}),call('createPendingOrder',{...input(),appAccess:access})]);assert.equal(concurrent.filter(x=>x.status===200).length,1,'atomic limit permits only one simultaneous checkout');
 assert.equal((await call('saveAppControls',{...config,version:0},'owner@example.com')).status,400);
 config=await rpc('saveAppControls',{...config,drops:[{...config.drops[0],publicAt:new Date(Date.now()-1000).toISOString()}]},'owner@example.com');assert.ok((await rpc('listCatalog')).some(x=>x.id===p.id));
 config=await rpc('saveAppControls',{...config,drops:[{...config.drops[0],paused:true}]},'owner@example.com');assert.ok(!(await rpc('listCatalog',access)).some(x=>x.id===p.id));
 await rpc('savePromotion',{code:'APPFIRST',title:'App first',kind:'percent',value:10,minimumKobo:0,minimumQuantity:1,productIds:[],maxUses:100,startsAt:past,endsAt:future,active:true},'owner@example.com');
 config=await rpc('saveAppControls',{...config,drops:[],offers:[{kind:'promotion',code:'APPFIRST',channel:'app',perCustomer:1,maxDiscountKobo:1000}]},'owner@example.com');
 const items=[{productId:p.id,lineTotalKobo:p.priceKobo,quantity:1}];assert.equal((await call('quotePromotion','APPFIRST',items,web)).status,400);assert.equal((await rpc('quotePromotion','APPFIRST',items,access)).discountKobo,Math.min(1000,Math.floor(p.priceKobo*.1)));
 const q=await rpc('quotePromotion','APPFIRST',items,access);const offers=await Promise.all([call('createPendingOrder',{...input(),appAccess:access,promotionCode:'APPFIRST',expectedTotalKobo:p.priceKobo-q.discountKobo}),call('createPendingOrder',{...input(),appAccess:access,promotionCode:'APPFIRST',expectedTotalKobo:p.priceKobo-q.discountKobo})]);assert.equal(offers.filter(x=>x.status===200).length,1);
 assert.equal((await call('setMemberWatch',web,{kind:'restock',target:variantId,enabled:true})).status,400);
 await rpc('setMemberWatch',access,{kind:'restock',target:variantId,enabled:true});await rpc('checkMemberAlerts');assert.equal((await rpc('memberHub',access)).watches[0].status,'ready');await rpc('setMemberWatch',access,{kind:'restock',target:variantId,enabled:false});assert.equal((await rpc('memberHub',access)).watches.length,0);
 // Allocation is global across accounts; per-customer and physical stock remain separate.
 const second=(await rpc('listCatalog')).find(x=>x.id!==p.id),secondVariant=second.colorways[0].variantIds.S;
 await db.prepare('UPDATE product_variants SET stock=20 WHERE id=?').bind(secondVariant).run();
 config=await rpc('saveAppControls',{...config,drops:[{productId:second.id,title:'Limited allocation',mode:'app',startsAt:past,publicAt:null,perCustomer:2,allocation:1}]},'owner@example.com');
 const limited=await Promise.all(['buyer@example.com','second@example.com'].map(email=>call('createPendingOrder',{...input(),customer:{...input().customer,email},cart:[{variantId:secondVariant,quantity:1}],expectedTotalKobo:second.priceKobo,appAccess:{...access,email,customerId:email}})));
 assert.equal(limited.filter(x=>x.status===200).length,1,'one global exclusive allocation across different accounts');
 // A delayed settlement must respect the first-purchase rule even after checkout.
 const offerOrder=offers.find(x=>x.status===200).data;
 const snapshot=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind('order-app-limits:'+offerOrder.reference).first();assert.ok(snapshot&&JSON.parse(snapshot.value).length);
 await db.prepare('UPDATE store_meta SET value=? WHERE key=?').bind(JSON.stringify([{kind:'promotion',code:'APPFIRST',quantity:1,maximum:1,firstPurchase:true}]),'order-app-limits:'+offerOrder.reference).run();
 await db.prepare("UPDATE orders SET payment_status='paid' WHERE id=?").bind(first.id).run();
 const settled=await rpc('markOrderPaid',{reference:offerOrder.reference,amountKobo:offerOrder.totalKobo,eventKey:'app-limit-paid',eventType:'charge.success'});
 assert.equal(settled.paymentStatus,'paid');assert.equal(settled.status,'paid_stock_review','record received money but hold conflicting first-purchase allocation for owner review');
 config=await rpc('saveAppControls',{...config,drops:[],offers:[{...config.offers[0],firstPurchase:true}]},'owner@example.com');
 await db.prepare("UPDATE orders SET payment_status='paid' WHERE id=?").bind(first.id).run();assert.equal((await call('quotePromotion','APPFIRST',items,access)).status,400,'first purchase offer rejects previous paid customers');
 config=await rpc('saveAppControls',{...config,offers:[{...config.offers[0],firstPurchase:false}]},'owner@example.com');
 // Optional alert failures must not stop payment/order notifications.
 const tracked=offers.find(x=>x.status===200).data;
 await db.prepare('INSERT INTO app_customer_orders(customer_id,reference) VALUES(?,?)').bind('buyer',tracked.reference).run();
 await rpc('registerPush','buyer','ExponentPushToken[fixture]');
 await rpc('setMemberWatch',access,{kind:'restock',target:variantId,enabled:true});await rpc('checkMemberAlerts');
 await db.prepare("UPDATE orders SET status='processing' WHERE id=?").bind(tracked.id).run();pushFailure=true;await rpc('sendOrderPushUpdates');assert.ok(pushBodies.some(b=>b.some(m=>m.data.orderReference===tracked.reference)),'order updates survive optional alert outage');
 config=await rpc('saveAppControls',{...config,restocks:false},'owner@example.com');pushFailure=false;pushBodies=[];await rpc('sendOrderPushUpdates');assert.equal(pushBodies.length,0,'queued alert respects disabled restocks immediately');
 config=await rpc('saveAppControls',{...config,restocks:true},'owner@example.com');pushFailure=false;pushBodies=[];await rpc('sendOrderPushUpdates');assert.ok(pushBodies.some(b=>b.some(m=>m.data.appBenefits)));pushBodies=[];await rpc('sendOrderPushUpdates');assert.equal(pushBodies.length,0,'accepted alerts do not repeat every cron tick');
 config=await rpc('saveAppControls',{...config,enabled:false},'owner@example.com');assert.equal((await rpc('quotePromotion','APPFIRST',items,web)).discountKobo,Math.floor(p.priceKobo*.1));assert.ok((await rpc('createPendingOrder',input())).reference);
 }finally{await mf.dispose();}
});
