import {JSDOM,VirtualConsole} from 'jsdom';
import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {Miniflare} from './miniflare.mjs';
test('Bulk dispatch preserves courier/destination, locks paid bookings, links automatically and blocks ambiguous retries',async t=>{
 await build({entryPoints:['tests/bulk-dispatch-worker.ts'],outfile:'work/bulk-dispatch-test.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',external:['cloudflare:workers'],conditions:['workerd','browser']});
 let bookingCalls=0,quoteCalls=0,balance=100000,throwBooking=false,wrongCourier=false,lastRateBody,lastBookBody,walletGate;const addresses=[];
 let terminalCalls=0,terminalBookings=0,terminalBalance=100000;
 const mf=new Miniflare({modules:true,scriptPath:'work/bulk-dispatch-test.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{SHIPBUBBLE_API_KEY:'sb_prod_fixture',TERMINAL_AFRICA_LIVE_SECRET_KEY:'terminal-live-fixture'},outboundService:async r=>{
  if(new URL(r.url).hostname==='api.terminal.africa'){
   terminalCalls++;assert.equal(r.headers.get('Authorization'),'Bearer terminal-live-fixture');
   const rate={rate_id:'RT-FIXTURE',carrier_name:'Terminal Courier',carrier_rate_description:'Ground',currency:'NGN',amount:6000,used:false,delivery_time:'3 days'};
   if(r.url.endsWith('/users/wallet'))return Response.json({status:true,data:{active:true,wallet_enabled:true,amount:terminalBalance,currency:"NGN"}});
   if(r.url.endsWith('/packaging')){const p=await r.json();assert.equal(p.weight,2.06);return Response.json({status:true,data:{packaging_id:'PA-FIXTURE'}});}
   if(r.url.endsWith('/rates/shipment/quotes')){const q=await r.json();assert.equal(q.pickup_address.city,'Kaduna');assert.equal(q.delivery_address.city,'Ikeja');assert.equal(q.delivery_address.zip,'100001');assert.equal(q.persist_data,true);assert.equal(q.parcel.items[0].quantity,1);return Response.json({status:true,data:[rate]});}
   if(r.url.endsWith('/rates/RT-FIXTURE'))return Response.json({status:true,data:rate});
   assert.ok(r.url.endsWith('/shipments/pickup'));terminalBookings++;assert.equal((await r.json()).rate_id,'RT-FIXTURE');return Response.json({status:true,data:{shipment_id:'SH-FIXTURE',status:'confirmed',address_to:{email:'buyer@example.com'},extras:{tracking_number:'TN-FIXTURE',tracking_url:'https://terminal.africa/tracking/SH-FIXTURE'}}});
  }
  assert.equal(r.headers.get('Authorization'),'Bearer sb_prod_fixture');
  if(r.url.endsWith('/wallet/balance')){const gate=walletGate;walletGate=undefined;if(gate){gate.enter();await gate.release;}return Response.json({status:'success',data:{balance,currency:'NGN'}});}
  if(r.url.endsWith('/address/validate')){addresses.push(await r.json());return Response.json({status:'success',data:{address_code:123}});}
  if(r.url.endsWith('/labels/categories'))return Response.json({status:'success',data:[{category:'Fashion wears',category_id:1}]});
  if(r.url.endsWith('/fetch_rates')){lastRateBody=await r.json();quoteCalls++;return Response.json({status:'success',data:{request_token:'fresh-token-'+quoteCalls,couriers:[{service_code:wrongCourier?'different':'selected',courier_id:7,courier_name:'Selected courier',total:5000,rate_card_amount:5500,currency:'NGN',service_type:'pickup',delivery_eta:'3 days'},{service_code:'cheap',courier_id:'cheaper',courier_name:'Cheaper courier',total:2000,currency:'NGN',service_type:'pickup'}]}});}
  assert.ok(r.url.endsWith('/shipping/labels'));bookingCalls++;lastBookBody=await r.json();if(throwBooking)return new Response('Ambiguous upstream error',{status:503});
  return Response.json({status:'success',data:{order_id:'SB-FIXTURE-'+bookingCalls,status:'pending',courier:{name:'Selected courier'},ship_to:{email:'buyer@example.com'},payment:{shipping_fee:5000,currency:'NGN',status:'completed'},tracking_url:'https://app.shipbubble.com/tracking/SB-FIXTURE-'+bookingCalls}});
 }});
 try{
 const db=await mf.getD1Database('DB');await db.exec("CREATE TABLE store_meta(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE admin_audit(actor TEXT,action TEXT,entity TEXT,detail TEXT); CREATE TABLE products(id TEXT PRIMARY KEY,name TEXT,category TEXT,details_json TEXT); CREATE TABLE product_variants(id TEXT PRIMARY KEY,product_id TEXT,size TEXT); CREATE TABLE order_items(id INTEGER PRIMARY KEY,order_id TEXT,product_id TEXT,size TEXT,product_name TEXT,quantity INTEGER); CREATE TABLE orders(id TEXT PRIMARY KEY,reference TEXT,payment_status TEXT,status TEXT,email TEXT,first_name TEXT,last_name TEXT,phone TEXT,address_line_1 TEXT,address_line_2 TEXT,city TEXT,state TEXT,country TEXT,subtotal_kobo INTEGER,shipping_kobo INTEGER,carrier TEXT,tracking_number TEXT,tracking_url TEXT,created_at TEXT,updated_at TEXT);");
 const meta=async(k,v)=>db.prepare('INSERT OR REPLACE INTO store_meta VALUES(?,?)').bind(k,JSON.stringify(v)).run();
 await db.prepare("INSERT INTO products VALUES('tee','Tee','Tees','{}')").run();await db.prepare("INSERT INTO product_variants VALUES('tee-l','tee','L')").run();
 await meta('parcel-item:tee:L',{revision:'profile-1',data:{weightGrams:400,lengthCm:28,widthCm:23,heightCm:3,measured:false,approvedForCheckout:true}});
 await meta('parcel-packaging',{revision:'box-1',data:[{id:'box',name:'Approved box',boxGrams:2000,wrapGrams:60,tareGrams:2060,lengthCm:36,widthCm:25,heightCm:15,maxWeightGrams:8000,measured:false,approvedForCheckout:true}]});
 await meta('terminal_business_pickup',{revision:'pickup-1',details:{first_name:'Test',last_name:'Shop',email:'shop@example.com',phone:'+2348000000000',line1:'20 Pickup Street',line2:'',city:'Kaduna',state:'Kaduna',country:'NG',zip:'800001'}});
 for(const ref of ['VN-ONE','VN-TWO','VN-STALE','VN-NOFUNDS','VN-UNKNOWN','VN-MISSING','VN-WRONG','VN-UNPAID','VN-RACE','VN-PREFLIGHT-STALE','VN-PACKED','VN-TERMINAL','VN-PACK-RACE']){await db.prepare("INSERT INTO orders(id,reference,payment_status,status,email,first_name,last_name,phone,address_line_1,address_line_2,city,state,country,subtotal_kobo,shipping_kobo,created_at) VALUES(?,?,'paid','paid','buyer@example.com','Test','Buyer','08000000000','10 Recipient Street','','Ikeja','Lagos','Nigeria',3500000,450000,'2026-10-09')").bind(ref,ref).run();await db.prepare("INSERT INTO order_items(order_id,product_id,size,product_name,quantity) VALUES(?,'tee','L','Tee',1)").bind(ref).run();if(ref!=='VN-MISSING')await meta('order-shipping:'+ref,{rate:{provider:'shipbubble',carrier:'Selected courier',service:'selected',id:'old-token:selected',amountKobo:450000,walletKobo:400000,currency:'NGN'},parcel:{weightKg:2.16,lengthCm:36,widthCm:25,heightCm:15}});}
 await db.prepare("UPDATE orders SET payment_status='pending' WHERE reference='VN-UNPAID'").run();
 const rpc=async(action,...args)=>{const r=await mf.dispatchFetch('https://test/rpc',{method:'POST',body:JSON.stringify({action,args})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
 const row=async(ref)=>(await rpc('dispatchOrders')).rows.find(r=>r.reference===ref);
 const review=async(ref)=>{const r=await row(ref);return rpc('reviewDispatch',{reference:ref,fingerprint:r.fingerprint,parcel:r.defaults,pickupDate:new Date(Date.now()+86400000).toISOString().slice(0,10),packed:true},'owner@example.com');};
 await t.test('prefills current approved parcel and preserves exact courier even when cheaper options exist',async()=>{const r=await row('VN-ONE');assert.equal(r.defaults.weightKg,2.46);assert.equal(r.carrier,'Selected courier');const q=await review('VN-ONE');assert.equal(q.chargeKobo,500000);assert.equal(q.extraKobo,50000);assert.equal(lastRateBody.package_items[0].unit_weight,2.46);assert.ok(addresses.some(a=>a.address.includes('10 Recipient Street')));assert.equal(bookingCalls,0);assert.ok(!JSON.stringify(q).includes('fresh-token'));});
 await t.test('bulk screen reviews multiple rows, totals wallet charges and requires explicit booking approval',async()=>{
 const html=await(await mf.dispatchFetch('https://test/preview')).text();const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM(html,{url:'https://test/api/admin/bulk-dispatch',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.fetch=async(url,opts)=>{const body=JSON.parse(opts.body);try{const result=body.action==='review'?await rpc('reviewDispatch',body,'owner@example.com'):await rpc('bookDispatch',body.id,'owner@example.com');return {ok:true,json:async()=>result};}catch(e){return {ok:false,json:async()=>({error:e.message})};}};}});
 try{const d=dom.window.document;assert.deepEqual(errors,[]);for(const ref of ['VN-ONE','VN-TWO'])d.querySelector('[data-reference="'+ref+'"] .selected').checked=true;d.getElementById('packed').checked=true;d.getElementById('review').click();
 for(let i=0;i<200&&d.getElementById('review-panel').hidden;i++)await new Promise(r=>setTimeout(r,10));assert.equal(d.querySelectorAll('#review-list article').length,2);assert.match(d.getElementById('total').textContent,/10,000/);assert.ok(dom.window.location.search.includes('reviews='));d.getElementById('book').click();assert.match(d.getElementById('progress').textContent,/approval/);assert.equal(bookingCalls,0);assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
 });
 await t.test('batch checks the combined cost before any booking and fails closed on unknown balances',async()=>{
  const a=await review('VN-ONE'),b=await review('VN-TWO'),before=bookingCalls;
  balance=7500;await assert.rejects(rpc('checkDispatchFunds',[a.id,b.id],'owner@example.com'),/Insufficient funds.*10,000.*2,500/);assert.equal(bookingCalls,before);
  balance=10000;assert.equal((await rpc('checkDispatchFunds',[a.id,b.id],'owner@example.com')).ready,true);
  balance=null;await assert.rejects(rpc('bookDispatch',a.id,'owner@example.com'),/balance could not be verified/);assert.equal(bookingCalls,before);
  balance=100000;
 });
 await t.test('paid booking uses fresh provider IDs, is idempotent under concurrent clicks, and links tracking',async()=>{const q=await review('VN-ONE');const results=await Promise.all([rpc('bookDispatch',q.id,'owner@example.com'),rpc('bookDispatch',q.id,'owner@example.com')]);assert.equal(bookingCalls,1);assert.ok(results.some(r=>r.state==='booked'));assert.equal(lastBookBody.courier_id,'7');assert.equal(lastBookBody.service_code,'selected');assert.match(lastBookBody.request_token,/^fresh-token/);assert.equal((await rpc('bookDispatch',q.id,'owner@example.com')).state,'booked');assert.equal(bookingCalls,1);const o=await db.prepare("SELECT * FROM orders WHERE reference='VN-ONE'").first();assert.equal(o.shipping_kobo,450000);assert.equal(o.status,'processing');assert.equal(o.tracking_number,'SB-FIXTURE-1');assert.equal((await db.prepare("SELECT value FROM store_meta WHERE key='shipbubble-order:VN-ONE'").first()).value,'SB-FIXTURE-1');});
 await t.test('failed order does not stop another order from succeeding',async()=>{const q=await review('VN-TWO');assert.equal((await rpc('bookDispatch',q.id,'owner@example.com')).state,'booked');assert.equal(bookingCalls,2);});
 await t.test('stale pickup and parcel changes cannot be booked',async()=>{const q=await review('VN-STALE');await meta('parcel-item:tee:L',{revision:'profile-2',data:{weightGrams:500,lengthCm:28,widthCm:23,heightCm:3,measured:false,approvedForCheckout:true}});await assert.rejects(rpc('bookDispatch',q.id,'owner@example.com'),/changed/);assert.equal(bookingCalls,2);const next=await review('VN-STALE');await db.prepare("UPDATE orders SET address_line_1='Changed address' WHERE reference='VN-STALE'").run();await assert.rejects(rpc('bookDispatch',next.id,'owner@example.com'),/changed/);});
 await t.test('insufficient funds do not submit or claim a booking',async()=>{const q=await review('VN-NOFUNDS');balance=1;await assert.rejects(rpc('bookDispatch',q.id,'owner@example.com'),/Insufficient funds/);assert.equal(await db.prepare("SELECT value FROM store_meta WHERE key='dispatch-booking:VN-NOFUNDS'").first(),null);balance=100000;});
 await t.test('ambiguous provider results never automatically retry',async()=>{const q=await review('VN-UNKNOWN');throwBooking=true;const r=await rpc('bookDispatch',q.id,'owner@example.com');assert.equal(r.state,'needs_review');const count=bookingCalls;await rpc('bookDispatch',q.id,'owner@example.com');assert.equal(bookingCalls,count);await assert.rejects(review('VN-UNKNOWN'),/unresolved/);throwBooking=false;});
 await t.test('missing courier, unavailable selected service, unpaid order and wrong owner are blocked',async()=>{await assert.rejects(review('VN-MISSING'));wrongCourier=true;await assert.rejects(review('VN-WRONG'),/unavailable/);wrongCourier=false;assert.equal(await row('VN-UNPAID'),undefined);const q=await review('VN-WRONG');await assert.rejects(rpc('bookDispatch',q.id,'other@example.com'),/not found/);assert.equal((await mf.dispatchFetch('https://test/admin')).status,503);});
 await t.test('a booking completed during another request’s wallet preflight is returned without a second charge',async()=>{
  const q=await review('VN-RACE'),before=bookingCalls;
  let enter,release;const entered=new Promise(resolve=>enter=resolve),blocked=new Promise(resolve=>release=resolve);
  walletGate={enter,release:blocked};
  const delayed=rpc('bookDispatch',q.id,'owner@example.com');
  try{
   await entered;
   const winner=await rpc('bookDispatch',q.id,'owner@example.com');
   assert.equal(winner.state,'booked');
   balance=0; // The winner can consume the remaining wallet funds.
   release();
   assert.deepEqual(await delayed,winner);
   assert.equal(bookingCalls,before+1);
   assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM admin_audit WHERE entity='VN-RACE' AND action='bulk dispatch booked'").first()).n,1);
  }finally{release();balance=100000;await delayed.catch(()=>{});}
 });
 await t.test('a genuine address change during wallet preflight still blocks booking',async()=>{
  const q=await review('VN-PREFLIGHT-STALE'),before=bookingCalls;
  let enter,release;const entered=new Promise(resolve=>enter=resolve),blocked=new Promise(resolve=>release=resolve);
  walletGate={enter,release:blocked};
  const delayed=rpc('bookDispatch',q.id,'owner@example.com');
  const rejected=assert.rejects(delayed,/changed/);
  try{await entered;await db.prepare("UPDATE orders SET address_line_1='New destination' WHERE reference='VN-PREFLIGHT-STALE'").run();}
  finally{release();}
  await rejected;
  assert.equal(bookingCalls,before);
  assert.equal(await db.prepare("SELECT value FROM store_meta WHERE key='dispatch-booking:VN-PREFLIGHT-STALE'").first(),null);
 });
 await t.test('packed queue spans pages, excludes stale/unpacked orders and saves owner-only batch reviews',async()=>{
  const before=bookingCalls,r=await row('VN-PACKED');
  assert.equal((await rpc('readyDispatchOrders')).ready.length,0);
  await rpc('markDispatchPacked',{reference:r.reference,fingerprint:r.fingerprint,parcel:r.defaults,packed:true},'owner@example.com');
  for(let i=0;i<25;i++)await db.prepare("INSERT INTO orders(id,reference,payment_status,status,country,created_at) VALUES(?,?,'paid','paid','NG','2030-01-01')").bind('VN-NEW-'+i,'VN-NEW-'+i).run();
  assert.ok(!(await rpc('dispatchOrders')).rows.some(r=>r.reference==='VN-PACKED'));
  const ready=await rpc('readyDispatchOrders');assert.deepEqual(ready.ready.map(r=>r.reference),['VN-PACKED']);
  const q=await rpc('reviewDispatch',{...ready.ready[0],packed:true,requirePacked:true,pickupDate:new Date(Date.now()+86400000).toISOString().slice(0,10)},'owner@example.com');
  const batch=await rpc('startDispatchBatch','owner@example.com');await rpc('appendDispatchReview',batch.id,q.id,'owner@example.com');
  assert.equal((await rpc('dispatchBatchReviews',batch.id,'owner@example.com'))[0].id,q.id);
  await assert.rejects(rpc('dispatchBatchReviews',batch.id,'someone@example.com'),/not found/);
  await rpc('markDispatchPacked',{reference:r.reference,fingerprint:r.fingerprint,parcel:r.defaults,packed:false},'owner@example.com');
  await assert.rejects(rpc('bookDispatch',q.id,'owner@example.com'),/no longer packed/);
  await rpc('markDispatchPacked',{reference:r.reference,fingerprint:r.fingerprint,parcel:r.defaults,packed:true},'owner@example.com');
  await db.prepare("UPDATE orders SET address_line_1='Changed after packing' WHERE reference='VN-PACKED'").run();
  assert.equal((await rpc('readyDispatchOrders')).ready.length,0);
  assert.equal(bookingCalls,before);
 });
 await t.test('Terminal routing stays closed for an inactive wallet and preserves its saved courier with one shared booking lock',async()=>{
  await db.prepare("DELETE FROM orders WHERE reference LIKE 'VN-NEW-%'").run();
  await db.prepare("UPDATE orders SET address_line_2='Postal code: 100001' WHERE reference='VN-TERMINAL'").run();
  await meta('order-shipping:VN-TERMINAL',{rate:{provider:'terminal',carrier:'Terminal Courier',service:'Ground',id:'RT-OLD',amountKobo:500000,walletKobo:500000,currency:'NGN'}});
  await meta('terminal_live_connection',{status:'connected',authenticated:true,walletActive:false,walletEnabled:false});
  const r=await row('VN-TERMINAL');await rpc('markDispatchPacked',{reference:r.reference,fingerprint:r.fingerprint,parcel:r.defaults,packed:true},'owner@example.com');
  assert.equal((await rpc('readyDispatchOrders','terminal')).ready.length,0);await assert.rejects(review('VN-TERMINAL'));assert.equal(terminalCalls,0);
  await meta('terminal_live_connection',{status:'connected',authenticated:true,walletActive:true,walletEnabled:true});
  assert.equal((await rpc('readyDispatchOrders','terminal')).ready.length,1);
  const q=await review('VN-TERMINAL');assert.equal(q.provider,'terminal');assert.equal(q.chargeKobo,600000);assert.equal(q.pickupDate,'Next available courier pickup');
  terminalBalance=null;await assert.rejects(rpc('bookDispatch',q.id,'owner@example.com'),/balance could not be verified/);
  terminalBalance=1;await assert.rejects(rpc('bookDispatch',q.id,'owner@example.com'),/Insufficient funds.*Terminal Africa/);assert.equal(terminalBookings,0);assert.equal(await db.prepare("SELECT value FROM store_meta WHERE key='dispatch-booking:VN-TERMINAL'").first(),null);const shipReview=await review('VN-NOFUNDS');await assert.rejects(rpc('checkDispatchFunds',[shipReview.id,q.id],'owner@example.com'),/Insufficient funds.*Terminal Africa/);assert.equal(terminalBookings,0);terminalBalance=100000;
  const before=bookingCalls;const results=await Promise.all([rpc('bookDispatch',q.id,'owner@example.com'),rpc('bookDispatch',q.id,'owner@example.com')]);
  assert.ok(results.some(r=>r.state==='booked'));assert.equal(terminalBookings,1);assert.equal(bookingCalls,before);
  assert.equal((await db.prepare("SELECT value FROM store_meta WHERE key='terminal-order:VN-TERMINAL'").first()).value,'SH-FIXTURE');
  assert.equal(await db.prepare("SELECT value FROM store_meta WHERE key='shipbubble-order:VN-TERMINAL'").first(),null);
  assert.equal((await rpc('bookDispatch',q.id,'owner@example.com')).state,'booked');assert.equal(terminalBookings,1);
 });
 await t.test('mass-dispatch UI saves packed status, reviews all ready orders and requests pickups only after confirmation',async()=>{
  const html=await(await mf.dispatchFetch('https://test/preview')).text(),errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
  const dom=new JSDOM(html,{url:'https://test/api/admin/bulk-dispatch',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.fetch=async(url,opts)=>{const b=JSON.parse(opts.body);try{let result;if(b.action==='packed')result=await rpc('markDispatchPacked',b,'owner@example.com');else if(b.action==='ready')result=await rpc('readyDispatchOrders',b.provider,b.after);else if(b.action==='start-batch')result=await rpc('startDispatchBatch','owner@example.com');else if(b.action==='review'){result=await rpc('reviewDispatch',{...b,requirePacked:true},'owner@example.com');await rpc('appendDispatchReview',b.batchId,result.id,'owner@example.com');}else if(b.action==='check-funds')result=await rpc('checkDispatchFunds',b.ids,'owner@example.com');else result=await rpc('bookDispatch',b.id,'owner@example.com');return {ok:true,json:async()=>result};}catch(e){return {ok:false,json:async()=>({error:e.message})};}};}});
  try{const d=dom.window.document,mark=d.querySelector('[data-reference="VN-PACKED"] .mark-packed');assert.deepEqual(errors,[]);mark.click();for(let i=0;i<300&&mark.dataset.packed!=='true';i++)await new Promise(r=>setTimeout(r,10));assert.equal(mark.dataset.packed,'true');
   d.getElementById('review-all').click();for(let i=0;i<300&&d.getElementById('review-panel').hidden;i++)await new Promise(r=>setTimeout(r,10));assert.equal(d.getElementById('review-panel').hidden,false);assert.ok(dom.window.location.search.includes('batch='));assert.match(d.getElementById('total').textContent,/Shipbubble/);assert.match(d.getElementById('total').textContent,/Terminal Africa/);
   const before=bookingCalls;d.getElementById('book').click();assert.equal(bookingCalls,before);assert.match(d.getElementById('progress').textContent,/approval/);
   d.getElementById('confirm').checked=true;d.getElementById('book').click();for(let i=0;i<300&&!d.getElementById('review-list').textContent.includes('Booked');i++)await new Promise(r=>setTimeout(r,10));assert.match(d.getElementById('review-list').textContent,/Booked/);assert.equal(bookingCalls,before+1);assert.deepEqual(errors,[]);
  }finally{dom.window.close();}
 });
 await t.test('unmarking packed during preflight blocks the booking without charging',async()=>{
  const r=await row('VN-PACK-RACE');await rpc('markDispatchPacked',{reference:r.reference,fingerprint:r.fingerprint,parcel:r.defaults,packed:true},'owner@example.com');
  const q=await rpc('reviewDispatch',{reference:r.reference,fingerprint:r.fingerprint,parcel:r.defaults,packed:true,requirePacked:true,pickupDate:new Date(Date.now()+86400000).toISOString().slice(0,10)},'owner@example.com');
  let enter,release;const entered=new Promise(resolve=>enter=resolve),blocked=new Promise(resolve=>release=resolve);walletGate={enter,release:blocked};const before=bookingCalls;
  const delayed=rpc('bookDispatch',q.id,'owner@example.com'),rejected=assert.rejects(delayed,/no longer packed/);
  try{await entered;await rpc('markDispatchPacked',{reference:r.reference,fingerprint:r.fingerprint,parcel:r.defaults,packed:false},'owner@example.com');}finally{release();}
  await rejected;assert.equal(bookingCalls,before);
 });
 }finally{await mf.dispose();}
});
