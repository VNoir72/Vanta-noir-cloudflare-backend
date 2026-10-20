import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createHmac} from 'node:crypto';
import {readdir,readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {Miniflare} from './miniflare.mjs';

test('the live storefront adapter keeps tracking on-site and preserves checkout-only payment policy',async()=>{
 const {default:worker}=await import('../worker/storefront.mjs');const calls=[];
 const env={PUBLIC_API:{fetch:async r=>{calls.push(r);return new Response('tracking',{headers:{'Content-Type':'text/html','Referrer-Policy':'no-referrer'}});}},ASSETS:{fetch:async()=>new Response('page',{headers:{'Content-Type':'text/html'}})}};
 const r=await worker.fetch(new Request('https://vantanoir.store/track?reference=VN-TRACK',{headers:{Cookie:'private=1',Authorization:'Bearer private'}}),env);
 assert.equal(r.status,200);assert.equal(r.headers.get('location'),null);assert.equal(calls[0].url,'https://api.vantanoir.store/api/tracking/page');assert.equal(calls[0].headers.get('cookie'),null);assert.equal(calls[0].headers.get('authorization'),null);assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.ok(!r.headers.get('content-security-policy').includes('https://js.paystack.co'));
 const checkout=await worker.fetch(new Request('https://vantanoir.store/checkout'),env);assert.ok(checkout.headers.get('content-security-policy').includes('https://js.paystack.co'));
 assert.equal((await worker.fetch(new Request('https://vantanoir.store/track',{method:'POST'}),env)).status,405);
});

test('branded tracking verifies ownership; polling, exception alerts, security and digests are bounded and deduplicated',async()=>{
 await build({entryPoints:['tests/tracking-worker.ts'],outfile:'work/tracking.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2023',external:['cloudflare:workers'],conditions:['workerd','browser']});
 const old=new Date(Date.now()-72*3600000).toISOString();let calls=0,providerDown=false;const sent=[];
 let shipment={order_id:'SB-TRACK',status:'in_transit',courier:{name:'Test Courier',tracking_code:'COURIER-123'},package_status:[{status:'in_transit',datetime:old}],events:[{message:'Arrived at sorting facility',location:'Lagos',captured:old}]};
 const mf=new Miniflare({modules:true,scriptPath:'work/tracking.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{RESEND_API_KEY:'re_fixture',EMAIL_FROM:'Vanta Noir <test@example.com>',SHIPBUBBLE_API_KEY:'sb_prod_fixture',ADMIN_EMAIL:'owner@example.com',STOREFRONT_URL:'https://vantanoir.store'},outboundService:async r=>{if(r.url==='https://api.resend.com/emails'){sent.push(await r.json());return Response.json({id:'mail-'+sent.length});}calls++;assert.equal(r.method,'GET','Tracking must never book, fund or charge');assert.equal(r.url,'https://api.shipbubble.com/v1/shipping/labels/list/SB-TRACK');if(providerDown)return Response.json({status:'error'},{status:503});return Response.json({status:'success',data:{results:[shipment]}});}});
 try{
 const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 await db.prepare("INSERT INTO orders(id,reference,email,first_name,last_name,phone,address_line_1,city,state,subtotal_kobo,total_kobo,payment_status,status) VALUES('track','VN-TRACK','buyer@example.com','Buyer','Test','08012345678','Private address','Lagos','Lagos',100000,100000,'paid','processing')").run();
 await db.prepare('INSERT INTO store_meta VALUES(?,?)').bind('shipbubble-order:VN-TRACK','SB-TRACK').run();await db.prepare('INSERT INTO store_meta VALUES(?,?)').bind('shipbubble-shipment:SB-TRACK',JSON.stringify({reference:'VN-TRACK',linkedAt:old})).run();
 const rpc=async(method,config={})=>{const r=await mf.dispatchFetch('https://test/rpc',{method:'POST',body:JSON.stringify({method,config})});const d=await r.json();assert.equal(r.status,200,JSON.stringify(d));return d;};
 const lookup=async(email)=>mf.dispatchFetch('https://test/track',{method:'POST',body:JSON.stringify({reference:'VN-TRACK',email})});
 assert.equal((await lookup('wrong@example.com')).status,404);assert.equal((await mf.dispatchFetch('https://test/track',{method:'POST',body:JSON.stringify({reference:'VN-TRACK'})})).status,400);
 const first=await rpc('deliveryMonitoring');assert.equal(first.synced,1);assert.equal(first.exceptions,1);assert.equal(first.notifications,1);assert.equal(calls,1);assert.equal((await db.prepare('SELECT status FROM orders').first()).status,'shipped');
 const data=await (await lookup('buyer@example.com')).json();assert.equal(data.order.trackingUrl,'https://vantanoir.store/track?reference=VN-TRACK');assert.equal(data.order.brandedTrackingNumber,'VN-TRACK');assert.equal(data.order.trackingNumber,'COURIER-123');assert.equal(data.order.courierTrackingNumber,'COURIER-123');assert.equal(data.order.deliveryProgress.status,'in_transit');assert.equal(data.order.deliveryProgress.events[0].location,'Lagos');assert.ok(!JSON.stringify(data).includes('Private address'));
 await rpc('deliveryMonitoring');assert.equal(calls,1);assert.equal((await db.prepare("SELECT COUNT(*) n FROM email_outbox WHERE event_key LIKE 'automation:delivery:%'").first()).n,2);
 const hook=async(s)=>{const body=JSON.stringify(s),sig=createHmac('sha512','sb_prod_fixture').update(body).digest('hex');return mf.dispatchFetch('https://test/hook',{method:'POST',headers:{'x-ship-signature':sig},body});};
 shipment={...shipment,events:[...shipment.events,{message:'<img src=x onerror=alert(1)>',location:'Abuja',captured:new Date().toISOString()}]};await hook(shipment);
 const p=JSON.parse((await db.prepare("SELECT value FROM store_meta WHERE key='shipment-progress:VN-TRACK'").first()).value);assert.ok(Date.now()-Date.parse(p.activityAt)<60000,'New courier scan resets the stall clock');
 await Promise.all([hook({...shipment,status:'completed'}),hook({...shipment,status:'picked_up'})]);await hook({...shipment,status:'cancelled'});
 assert.equal((await db.prepare('SELECT status FROM orders').first()).status,'delivered');assert.equal((await (await lookup('buyer@example.com')).json()).order.deliveryProgress.status,'completed');
 await rpc('deliveryMonitoring');assert.equal((await db.prepare("SELECT COUNT(*) n FROM email_outbox WHERE event_key LIKE 'automation:delivery:customer:%'").first()).n,2);
 await db.prepare("INSERT INTO store_meta VALUES('payment-diagnostic:VN-TRACK',?)").bind(JSON.stringify({at:new Date().toISOString(),referenceMatches:false})).run();await db.prepare("INSERT INTO store_meta VALUES('security-rate:test',?)").bind(JSON.stringify({at:new Date().toISOString(),count:6})).run();
 await rpc('securityMonitoring');await rpc('securityMonitoring');assert.equal((await db.prepare("SELECT COUNT(*) n FROM email_outbox WHERE event_key LIKE 'automation:security:%'").first()).n,2);assert.equal((await db.prepare('SELECT status FROM orders').first()).status,'delivered');
 await db.prepare("INSERT INTO products(id,slug,name,category,description,price_kobo,image_url,image_alt,status,active) VALUES('liked','liked','Liked design','Tops','Description',100000,'/image.png','Test','published',1)").run();await db.prepare("INSERT INTO product_interest(visitor_id,product_id,color,size) VALUES('visitor','liked','Black','L')").run();
 await rpc('demandDigest',{summaryHour:0});await rpc('demandDigest',{summaryHour:0});assert.equal((await db.prepare("SELECT COUNT(*) n FROM email_outbox WHERE event_key LIKE 'automation:interest:%'").first()).n,1);
 const html=await (await mf.dispatchFetch('https://test/page')).text(),script=await (await mf.dispatchFetch('https://test/client.js')).text();const dom=new JSDOM(html,{url:'https://vantanoir.store/track?reference=VN-TRACK',runScripts:'outside-only'});
 try{dom.window.AbortSignal=AbortSignal;dom.window.fetch=async(_url,options)=>mf.dispatchFetch('https://test/track',options);dom.window.eval(script);const d=dom.window.document;assert.equal(d.getElementById('reference').value,'VN-TRACK');d.getElementById('contact').value='buyer@example.com';d.getElementById('tracking-form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));for(let i=0;i<50&&d.getElementById('result').hidden;i++)await new Promise(r=>setTimeout(r,20));assert.equal(d.getElementById('status').textContent,'Delivered');assert.equal(d.querySelector('#events img'),null,'Provider messages are text, not HTML');assert.ok(d.getElementById('events').textContent.includes('<img'));assert.equal(d.getElementById('result').hidden,false);}finally{dom.window.close();}
 // A provider outage retains the last authenticated snapshot, rather than inventing delivery progress.
 await db.prepare("UPDATE orders SET status='shipped'").run();await db.prepare("DELETE FROM store_meta WHERE key='shipment-check:VN-TRACK'").run();providerDown=true;const failed=await rpc('deliveryMonitoring');assert.deepEqual(failed.failed,['VN-TRACK']);assert.equal((await (await lookup('buyer@example.com')).json()).order.deliveryProgress.status,'completed');
 }finally{await mf.dispose();}
});
