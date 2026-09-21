import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {mkdir,readdir,readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
test('operations: stock conflicts, promotion limits, exchanges, signed tracking and staff authorization',async()=>{
 await mkdir('work',{recursive:true});await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/operations-test-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const {publicKey,privateKey}=await generateKeyPair('RS256'),issuer='https://operations-test.cloudflareaccess.com';const jwk={...await exportJWK(publicKey),kid:'ops',alg:'RS256',use:'sig'};
 const jwt=email=>new SignJWT({email}).setProtectedHeader({alg:'RS256',kid:'ops'}).setIssuer(issuer).setAudience('ops').setIssuedAt().setExpirationTime('10m').sign(privateKey);
 const mf=new Miniflare({modules:true,scriptPath:'work/operations-test-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{ADMIN_EMAIL:'owner@example.com',AUTH_PROVIDER:'cloudflare-access',CF_ACCESS_TEAM_DOMAIN:issuer,CF_ACCESS_AUD:'ops',COURIER_WEBHOOK_SECRET:'test-courier-secret'},outboundService:async req=>{assert.equal(req.url,issuer+'/cdn-cgi/access/certs');return Response.json({keys:[jwk]});}});
 try{
 const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){await db.batch((await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));}
 const rpc=async(action,...args)=>{const r=await mf.dispatchFetch('https://api.example.com/test',{method:'POST',body:JSON.stringify({action,args})});const p=await r.json();if(!r.ok)throw new Error(p.error);return p;};
 const req=async(resource,token,body)=>mf.dispatchFetch('https://api.example.com/api/admin/operations?resource='+resource,{method:body?'POST':'GET',headers:{'cf-access-jwt-assertion':token,Origin:'https://api.example.com','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const products=await rpc('listCatalog'),p=products[0],c=p.colorways[0],variantId=c.variantIds.S,replacement=c.variantIds.M;
 await rpc('sql','UPDATE product_variants SET stock=10 WHERE product_id=?',p.id);
 const promo={code:'BUNDLE10',title:'Bundle discount',kind:'percent',value:10,minimumKobo:0,minimumQuantity:2,productIds:[p.id],maxUses:1,startsAt:'2026-01-01T00:00:00.000Z',endsAt:'2099-01-01T00:00:00.000Z',active:true,version:0};
 await rpc('savePromotion',promo,'owner@example.com');await assert.rejects(rpc('savePromotion',promo,'owner@example.com'),/changed/);
 await assert.rejects(rpc('quotePromotion',promo.code,[{productId:p.id,lineTotalKobo:p.priceKobo,quantity:1}]),/requirements/);
 const customer={email:'buyer@example.com',firstName:'Test',lastName:'Buyer',phone:'08000000000',addressLine1:'10 Test Street',addressLine2:'',city:'Lagos',state:'Lagos'};
 const args={customer,cart:[{variantId,quantity:2}],shippingKobo:200000,promotionCode:promo.code,expectedTotalKobo:p.priceKobo*2-Math.floor(p.priceKobo*2*.1)+200000};
 await assert.rejects(rpc('createPendingOrder',{...args,expectedTotalKobo:1}),/prices/);
 const race=await Promise.allSettled([rpc('createPendingOrder',args),rpc('createPendingOrder',args)]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1,'One usage limit includes concurrent pending checkouts');const order=race.find(r=>r.status==='fulfilled').value;
 await assert.rejects(rpc('adjustStock',{variantId,expectedStock:10,stock:1,reason:'Warehouse count'},'owner@example.com'),/reserved/);
 await rpc('adjustStock',{variantId,expectedStock:10,stock:9,reason:'Warehouse count'},'owner@example.com');await assert.rejects(rpc('adjustStock',{variantId,expectedStock:10,stock:8,reason:'Stale count'},'owner@example.com'),/changed/);
 const payment={reference:order.reference,amountKobo:order.totalKobo,eventKey:'ops-paid',eventType:'test'};await Promise.all([rpc('markOrderPaid',payment),rpc('markOrderPaid',{...payment,eventKey:'ops-repeat'})]);
 assert.equal((await rpc('sql',"SELECT COUNT(*) AS n FROM stock_adjustments WHERE reason=?",'Sale '+order.reference)).results[0].n,1);
 await rpc('updateOrderStatus',order.reference,'processing');
 const event={id:'parcel-1',reference:order.reference,status:'shipped',carrier:'Local test carrier',trackingNumber:'TRACK-123'};
 const hook=async(value,valid=true,stamp=String(Math.floor(Date.now()/1000)))=>{const raw=JSON.stringify(value);return mf.dispatchFetch('https://api.example.com/api/courier/webhook',{method:'POST',headers:{'x-vanta-timestamp':stamp,'x-vanta-signature':valid?createHmac('sha256','test-courier-secret').update(stamp+'.'+raw).digest('hex'):'0'.repeat(64)},body:raw});};
 assert.equal((await hook(event,false)).status,401);assert.equal((await hook(event,true,'1000000000')).status,401);assert.equal((await hook(event)).status,200);assert.equal((await hook(event)).status,200);
 assert.equal((await rpc('sql','SELECT COUNT(*) AS n FROM courier_events')).results[0].n,1);
 await rpc('updateOrderStatus',order.reference,'delivered');assert.equal((await hook({...event,id:'late-shipping-event'})).status,409,'Late event cannot move delivered order backwards');
 const guest=await rpc('getGuestOrder',order.reference,customer.email,'');const returned=await rpc('requestReturn',{reference:order.reference,email:customer.email,kind:'exchange',reason:'Please exchange for another size.',items:[{id:guest.items[0].id,quantity:1}]});
 const ret={id:returned.id,version:0,status:'approved',notes:'Approved',refundKobo:0,refundReference:'',refundStatus:'none',restock:false};await rpc('updateReturn',ret,'owner@example.com');await rpc('updateReturn',{...ret,version:1,status:'received'},'owner@example.com');
 await assert.rejects(rpc('updateReturn',{...ret,version:2,status:'received',refundKobo:p.priceKobo},'owner@example.com'),/after discounts/);
 const exchange={returnId:returned.id,items:[{originalVariantId:variantId,variantId:replacement,quantity:1}]};const attempts=await Promise.allSettled([rpc('allocateExchange',exchange,'owner@example.com'),rpc('allocateExchange',exchange,'owner@example.com')]);assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);assert.equal((await rpc('sql','SELECT stock FROM product_variants WHERE id=?',replacement)).results[0].stock,9);
 await rpc('exchangeTracking',{returnId:returned.id,carrier:'Test',trackingNumber:'REPLACE-1',status:'shipped'},'owner@example.com');assert.equal((await rpc('getGuestOrder',order.reference,customer.email,'')).returnRequest.exchangeTracking,'REPLACE-1');
 const owner=await jwt('owner@example.com'),analyst=await jwt('analyst@example.com');await rpc('saveStaff',{email:'analyst@example.com',role:'analyst',active:true},'owner@example.com');assert.equal((await req('reports',analyst)).status,200);assert.equal((await req('orders',analyst)).status,403);assert.equal((await req('reports',analyst,{action:'stock',data:{variantId,expectedStock:7,stock:99,reason:'Not allowed'}})).status,403);assert.equal((await req('staff',owner)).status,200);
 await rpc('saveStaff',{email:'analyst@example.com',role:'analyst',active:false},'owner@example.com');assert.equal((await req('reports',analyst)).status,403,'Revoked user denied with still-valid JWT');
 }finally{await mf.dispose();}
});
