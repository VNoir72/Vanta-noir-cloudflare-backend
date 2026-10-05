import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {Miniflare} from './miniflare.mjs';import {randomUUID} from 'node:crypto';
test('sandbox delivery: quotes, concurrency, booking recovery, price validation, eligibility and tracking isolation',async()=>{
 await build({entryPoints:['tests/terminal-delivery-worker.ts'],outfile:'work/terminal-delivery.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',external:['cloudflare:workers']});
 let mode='ok',tracking='confirmed',bookCalls=0,quoteCalls=0;const rate={rate_id:'RT-test',amount:1400.76,currency:'NGN',carrier_name:'Test courier',delivery_time:'2 days',used:false};
 const mf=new Miniflare({modules:true,scriptPath:'work/terminal-delivery.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{TERMINAL_AFRICA_TEST_SECRET_KEY:'test-secret',ADMIN_EMAIL:'owner@example.com',AUTH_PROVIDER:'cloudflare-access'},outboundService:async r=>{
 assert.equal(new URL(r.url).hostname,'sandbox.terminal.africa');assert.equal(r.headers.get('authorization'),'Bearer test-secret');const p=new URL(r.url).pathname;
 if(p.endsWith('/packaging'))return Response.json({status:true,data:{packaging_id:'PA-test'}});
 if(p.endsWith('/quotes')){quoteCalls++;const b=await r.json();assert.equal(b.persist_data,true);assert.equal(b.parcel.items[0].weight,4.9);assert.equal(b.delivery_address.phone,'+2348000000000');return Response.json({status:true,data:mode==='empty'?[]:[rate,{...rate,rate_id:'RT-drop',dropoff_required:true},{...rate,rate_id:'RT-usd',currency:'USD'}]});}
 if(p.endsWith('/rates/RT-test'))return Response.json({status:true,data:{...rate,amount:mode==='changed'?2000:rate.amount}});
 if(p.endsWith('/shipments/pickup')){bookCalls++;if(mode==='broken')return new Response('unreadable',{status:502});return Response.json({status:true,data:{shipment_id:'SH-test',status:'confirmed',extras:{tracking_number:'TR-test',tracking_url:'https://tracking.example.com/test'}}});}
 if(p.endsWith('/shipments/track/SH-test'))return Response.json({status:true,data:{shipment_id:mode==='wrong'?'SH-wrong':'SH-test',status:tracking,events:[{status:tracking,created_at:new Date().toISOString()}]}});
 throw new Error('Unexpected outbound request '+p);
 }});
 try{const db=await mf.getD1Database('DB');await db.prepare('CREATE TABLE store_meta(key TEXT PRIMARY KEY,value TEXT)').run();await db.prepare('CREATE TABLE orders(reference TEXT PRIMARY KEY,payment_status TEXT,status TEXT)').run();await db.prepare("INSERT INTO orders VALUES('VN-paid','paid','processing'),('VN-unpaid','pending','pending')").run();await db.prepare('INSERT INTO store_meta VALUES(?,?)').bind('terminal_sandbox_pickup',JSON.stringify({city:'Kaduna',state:'Kaduna',country:'NG',line1:'Synthetic pickup',first_name:'Test',last_name:'Owner',phone:'+2348000000000',email:'test@example.com',zip:'800242'})).run();
 const input=()=>({id:randomUUID(),destination:{city:'Ikeja',state:'Lagos',line1:'Synthetic test address',zip:'100271'},parcel:{weightKg:5,lengthCm:53.34,widthCm:30.48,heightCm:12.7,valueNaira:10000}});
 const call=async b=>{const r=await mf.dispatchFetch('https://test.local/action',{method:'POST',body:JSON.stringify(b)});return {status:r.status,data:await r.json()};};const quote=i=>call({action:'quote',input:i});const book=(id,extra={})=>call({action:'book',id,rateId:'RT-test',amount:140076,confirmed:true,...extra});
 for(const method of ['GET','POST'])assert.equal((await mf.dispatchFetch('https://test.local/api/admin/terminal-shipping',{method})).status,403);
 assert.equal((await quote({...input(),reference:'VN-unpaid'})).status,400);assert.equal((await quote({...input(),parcel:{...input().parcel,weightKg:0}})).status,400);
 const i=input();await Promise.all(Array.from({length:8},()=>quote(i)));assert.equal(quoteCalls,1);let s=(await call({id:i.id})).data;assert.equal(s.rates.length,1);assert.equal(s.rates[0].amountKobo,140076);
 assert.equal((await book(i.id,{confirmed:false})).status,400);assert.equal((await book(i.id,{amount:1})).status,400);
 await Promise.all(Array.from({length:8},()=>book(i.id)));assert.equal(bookCalls,1);s=(await call({id:i.id})).data;assert.equal(s.stage,'booked');await book(i.id);assert.equal(bookCalls,1);
 tracking='delivered';s=(await call({action:'track',id:i.id})).data;assert.equal(s.tracking.status,'delivered');assert.equal(s.tracking.number,'TR-test');tracking='confirmed';assert.equal((await call({action:'track',id:i.id})).data.tracking.status,'delivered');mode='wrong';assert.equal((await call({action:'track',id:i.id})).status,400);
 mode='changed';const j=input();await quote(j);assert.equal((await book(j.id)).data.stage,'quoted');assert.equal(bookCalls,1);
 mode='broken';const k=input();await quote(k);assert.equal((await book(k.id)).data.stage,'needs_review');await book(k.id);assert.equal(bookCalls,2);await quote(k);assert.equal(bookCalls,2);
 mode='empty';assert.equal((await quote(input())).data.stage,'quote_failed');mode='ok';
 const paid={...input(),reference:'VN-paid'};s=(await quote(paid)).data;await db.prepare("UPDATE orders SET status='cancelled' WHERE reference='VN-paid'").run();assert.equal((await book(s.id)).status,400);assert.equal(bookCalls,2);
 const expired=input();s=(await quote(expired)).data;s.expiresAt='2000-01-01T00:00:00Z';await db.prepare('UPDATE store_meta SET value=? WHERE key=?').bind(JSON.stringify(s),'terminal-shipping:'+s.id).run();assert.equal((await book(s.id)).status,400);
 const order=await db.prepare("SELECT * FROM orders WHERE reference='VN-unpaid'").first();assert.equal(order.payment_status,'pending');assert.equal(order.status,'pending');
 }finally{await mf.dispose();}
});
