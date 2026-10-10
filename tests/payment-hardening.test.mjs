import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';
import {mkdir,readdir,readFile} from 'node:fs/promises';
import {createHmac,randomUUID} from 'node:crypto';
test('checkout attempts, payment email recovery and signed financial event notifications are idempotent',async()=>{
 await mkdir('work',{recursive:true});await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/payment-hardening-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 let initializations=0,failInit=false;const sent=[];
 const mf=new Miniflare({modules:true,scriptPath:'work/payment-hardening-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{ADMIN_EMAIL:'owner@example.com',PAYSTACK_SECRET_KEY:'sk_test_fixture',RESEND_API_KEY:'re_fixture',EMAIL_FROM:'test@example.com'},outboundService:async req=>{
  if(req.url==='https://api.paystack.co/transaction/initialize'){initializations++;if(failInit)return Response.json({status:false,message:'Temporary failure'},{status:503});const body=await req.json();return Response.json({status:true,data:{reference:body.reference,authorization_url:'https://checkout.paystack.com/'+body.reference,access_code:'fixture-access-code'}});}
  assert.equal(req.url,'https://api.resend.com/emails');sent.push(await req.json());return Response.json({id:'fixture'});
 }});
 try{
 const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 const call=async(action,...args)=>{const r=await mf.dispatchFetch('https://api.example.com/test',{method:'POST',body:JSON.stringify({action,args})});return {status:r.status,body:await r.json()};};
 const rpc=async(action,...args)=>{const r=await call(action,...args);assert.equal(r.status,200,JSON.stringify(r.body));return r.body;};
 const p=(await rpc('listCatalog'))[0],v=p.colorways[0].variantIds.S;await db.prepare('UPDATE product_variants SET stock=20 WHERE id=?').bind(v).run();
 const input={checkoutAttempt:randomUUID()+'-'+randomUUID(),customer:{email:'buyer@example.com',firstName:'Test',lastName:'Buyer',phone:'08000000000',addressLine1:'Test address',addressLine2:'',city:'Lagos',state:'Lagos'},cart:[{variantId:v,quantity:1}],shippingKobo:0,expectedTotalKobo:p.priceKobo};
 const [a,b]=await Promise.all([rpc('createPendingOrder',input),rpc('createPendingOrder',input)]);assert.equal(a.reference,b.reference);assert.equal(a.receiptToken,b.receiptToken);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM orders').first()).n,1);assert.equal((await db.prepare('SELECT SUM(quantity) AS n FROM stock_reservations').first()).n,1);
 assert.equal((await call('createPendingOrder',{...input,customer:{...input.customer,email:'other@example.com'}})).status,400);
 const pay={reference:a.reference,receiptToken:a.receiptToken,callbackUrl:'https://vantanoir.store/checkout/complete',email:input.customer.email,customerName:'Test Buyer'};
 await Promise.all([rpc('startCheckoutPayment',pay),rpc('startCheckoutPayment',pay)]);assert.equal(initializations,1);assert.ok((await rpc('startCheckoutPayment',pay)).authorizationUrl);assert.equal((await rpc('startCheckoutPayment',pay)).accessCode,'fixture-access-code','Retries resume the same secure popup transaction');

 const failed=await rpc('createPendingOrder',{...input,checkoutAttempt:randomUUID()+'-'+randomUUID()});failInit=true;
 assert.equal((await rpc('startCheckoutPayment',{...pay,reference:failed.reference,receiptToken:failed.receiptToken})).checking,true);
 assert.equal((await rpc('startCheckoutPayment',{...pay,reference:failed.reference,receiptToken:failed.receiptToken})).checking,true);assert.equal(initializations,2,'An ambiguous provider failure must not initialize again');
 await rpc('markOrderPaid',{reference:a.reference,amountKobo:a.totalKobo,eventKey:'fixture-paid',eventType:'verify.success',paymentDomain:'test'});
 assert.equal((await rpc('startCheckoutPayment',pay)).complete,true);
 await db.prepare("DELETE FROM email_outbox WHERE event_key=?").bind('order:'+a.reference+':payment').run();
 await rpc('recoverPaymentEmails');await rpc('recoverPaymentEmails');assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM email_outbox WHERE event_key IN (?,?)").bind('order:'+a.reference+':payment','owner-order:'+a.reference+':payment').first()).n,2);
 const stockBefore=(await db.prepare('SELECT stock FROM product_variants WHERE id=?').bind(v).first()).stock;
 const send=async(event,data,valid=true)=>{const raw=JSON.stringify({event,data});return mf.dispatchFetch('https://api.example.com/api/payments/webhook',{method:'POST',body:raw,headers:{'x-paystack-signature':valid?createHmac('sha512','sk_test_fixture').update(raw).digest('hex'):'0'.repeat(128)}});};
 const refund={transaction_reference:a.reference,refund_reference:'refund-fixture',amount:'500',currency:'NGN',status:'processed'};
 assert.equal((await send('refund.processed',refund,false)).status,401);assert.equal((await rpc('recentPaymentUpdates')).length,0);
 assert.equal((await send('refund.processed',refund)).status,200);assert.equal((await send('refund.processed',refund)).status,200);
 assert.equal((await send('charge.dispute.create',{id:7,transaction:{reference:a.reference},status:'awaiting-merchant-feedback'})).status,200);
 assert.equal((await rpc('recentPaymentUpdates')).length,2);assert.equal((await db.prepare('SELECT stock FROM product_variants WHERE id=?').bind(v).first()).stock,stockBefore,'Provider notices cannot change stock');
 assert.equal((await rpc('getOrderByReference',a.reference)).paymentStatus,'paid','Partial refund notices cannot rewrite the original payment');
 assert.equal((await mf.dispatchFetch('https://api.example.com/api/admin/payment-updates')).status,403);
 await rpc('processEmailOutbox',20);assert.equal(sent.filter(x=>x.to.includes('buyer@example.com')).length,1);assert.equal(sent.filter(x=>x.to.includes('owner@example.com')).length,3);
 const expiring=await rpc('createPendingOrder',{...input,checkoutAttempt:randomUUID()+'-'+randomUUID()});
 await db.prepare("INSERT INTO store_meta(key,value) VALUES(?,?)").bind('checkout-payment:'+expiring.reference,JSON.stringify({transfer:{expiresAt:new Date(Date.now()-1000).toISOString()}})).run();
 assert.equal((await rpc('getPublicPaymentOrder',expiring.reference)).status,'expired');
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM stock_reservations WHERE order_id=?').bind(expiring.id).first()).n,0);
 assert.equal((await rpc('startCheckoutPayment',{...pay,reference:expiring.reference,receiptToken:expiring.receiptToken})).expired,true,'Expired orders cannot initialize payment again');
 const stockBeforeLatePayment=(await db.prepare('SELECT stock FROM product_variants WHERE id=?').bind(v).first()).stock;
 await rpc('markOrderPaid',{reference:expiring.reference,amountKobo:expiring.totalKobo,eventKey:'late-paid',eventType:'verify.success',paymentDomain:'test'});
 assert.equal((await rpc('getPublicPaymentOrder',expiring.reference)).status,'paid_stock_review','Late verified money needs owner review, never silent fulfilment');
 assert.equal((await db.prepare('SELECT stock FROM product_variants WHERE id=?').bind(v).first()).stock,stockBeforeLatePayment);
 const future=await rpc('createPendingOrder',{...input,checkoutAttempt:randomUUID()+'-'+randomUUID()});
 await db.prepare("UPDATE orders SET created_at=datetime('now','-1 hour') WHERE reference=?").bind(future.reference).run();
 await db.prepare("INSERT INTO store_meta(key,value) VALUES(?,?)").bind('checkout-payment:'+future.reference,JSON.stringify({transfer:{expiresAt:new Date(Date.now()+60000).toISOString()}})).run();
 assert.equal((await rpc('getPublicPaymentOrder',future.reference)).status,'pending_payment','Provider account deadline overrides fallback order age');
 }finally{await mf.dispose();}
});
