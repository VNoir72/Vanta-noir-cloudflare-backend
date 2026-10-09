import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {Miniflare} from './miniflare.mjs';
test('Actual packed measurements are per paid order, preserve fees, reject stale edits and drive quote-only requests',async()=>{
 await build({entryPoints:['tests/shipbubble-webhook-worker.ts'],outfile:'work/order-measurements.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',external:['cloudflare:workers'],conditions:['workerd','browser']});
 let rateBody=null,providerCalls=0;
 const mf=new Miniflare({modules:true,scriptPath:'work/order-measurements.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{SHIPBUBBLE_API_KEY:'sb_prod_fixture'},outboundService:async r=>{
  providerCalls++;assert.equal(r.headers.get('authorization'),'Bearer sb_prod_fixture');
  if(r.url.endsWith('/address/validate'))return Response.json({status:'success',data:{address_code:12}});
  if(r.url.endsWith('/labels/categories'))return Response.json({status:'success',data:[{category:'Fashion Wears',category_id:1}]});
  assert.ok(r.url.endsWith('/fetch_rates'),'Only rate requests are allowed; no paid bookings');rateBody=await r.json();return Response.json({status:'success',data:{request_token:'test',couriers:[{service_code:'courier1',courier_name:'Test courier',total:5200,rate_card_amount:5500,currency:'NGN',service_type:'pickup',delivery_eta:'2 days'}]}});
 }});
 try{
 const db=await mf.getD1Database('DB');await db.exec("CREATE TABLE store_meta(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE admin_audit(actor TEXT,action TEXT,entity TEXT,detail TEXT); CREATE TABLE orders(reference TEXT PRIMARY KEY,email TEXT,payment_status TEXT,status TEXT,first_name TEXT,last_name TEXT,phone TEXT,address_line_1 TEXT,address_line_2 TEXT,city TEXT,state TEXT,country TEXT,subtotal_kobo INTEGER,shipping_kobo INTEGER,created_at TEXT);");
 await db.prepare("INSERT INTO orders VALUES('VN-MEASURE','buyer@example.com','paid','processing','Test','Buyer','08012345678','Test address','','Ikeja','Lagos','NG',3000000,200000,'2026-10-09')").run();
 await db.prepare('INSERT INTO store_meta VALUES(?,?)').bind('terminal_business_pickup',JSON.stringify({details:{first_name:'Test',last_name:'Shop',email:'shop@example.com',phone:'08012345678',line1:'Pickup address',line2:'',city:'Kaduna',state:'Kaduna',country:'NG',zip:'800001'}})).run();
 const request=(path,data)=>mf.dispatchFetch('https://test/'+path,{method:'POST',body:JSON.stringify({reference:'VN-MEASURE',...data})});
 const dimensions={weightKg:1.25,lengthCm:35,widthCm:25,heightCm:12};
 assert.equal((await request('quote',{})).status,400);assert.equal(providerCalls,0);
 for(const weightKg of [0,-1,51,''])assert.equal((await request('measure',{measurements:{...dimensions,weightKg},revision:null})).status,400);
 assert.equal((await request('measure',{measurements:{...dimensions,lengthCm:201},revision:null})).status,400);
 assert.equal((await request('measure',{reference:'VN-MISSING',measurements:dimensions,revision:null})).status,400);
 const saved=await(await request('measure',{measurements:dimensions,revision:null})).json();assert.deepEqual(saved.measurements,dimensions);
 assert.equal((await request('measure',{measurements:dimensions,revision:null})).status,400,'cannot overwrite from stale blank form');
 const next=await(await request('measure',{measurements:{...dimensions,weightKg:1.5},revision:saved.revision})).json();
 assert.equal((await request('quote',{revision:saved.revision})).status,400);assert.equal(providerCalls,0);
 const quote=await(await request('quote',{revision:next.revision})).json();assert.equal(quote.rates[0].amountKobo,550000);assert.equal(quote.shippingKobo,200000);assert.equal(providerCalls,4);
 assert.equal(rateBody.package_items[0].unit_weight,1.5);assert.equal(rateBody.package_items[0].unit_amount,30000);assert.deepEqual(rateBody.package_dimension,{length:35,width:25,height:12});
 assert.equal((await db.prepare('SELECT shipping_kobo FROM orders').first()).shipping_kobo,200000);
 await db.prepare("INSERT INTO store_meta VALUES('shipbubble-order:VN-MEASURE','SB-TEST')").run();assert.equal((await request('measure',{measurements:dimensions,revision:next.revision})).status,400);assert.equal((await request('quote',{revision:next.revision})).status,400);
 await db.prepare("DELETE FROM store_meta WHERE key='shipbubble-order:VN-MEASURE'").run();await db.prepare("UPDATE orders SET payment_status='pending'").run();assert.equal((await request('measure',{measurements:dimensions,revision:next.revision})).status,400);assert.equal((await request('quote',{revision:next.revision})).status,400);
 await db.prepare("UPDATE orders SET payment_status='paid',status='shipped'").run();assert.equal((await request('measure',{measurements:dimensions,revision:next.revision})).status,400);assert.equal((await request('quote',{revision:next.revision})).status,400);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM admin_audit').first()).n,2);
 }finally{await mf.dispose();}
});
