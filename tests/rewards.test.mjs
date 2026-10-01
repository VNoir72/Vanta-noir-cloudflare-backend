import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';
import {mkdir,readdir,readFile} from 'node:fs/promises';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
test('rewards: pre-discount thresholds, stock allocation, private redemption, races and owner controls',async t=>{
 await mkdir('work',{recursive:true});await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/rewards-test-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const {publicKey,privateKey}=await generateKeyPair('RS256'),issuer='https://rewards-test.cloudflareaccess.com',jwk={...await exportJWK(publicKey),kid:'rewards',alg:'RS256',use:'sig'};
 const jwt=email=>new SignJWT({email}).setProtectedHeader({alg:'RS256',kid:'rewards'}).setIssuer(issuer).setAudience('rewards').setIssuedAt().setExpirationTime('10m').sign(privateKey);
 const mf=new Miniflare({modules:true,scriptPath:'work/rewards-test-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{ADMIN_EMAIL:'owner@example.com',AUTH_PROVIDER:'cloudflare-access',CF_ACCESS_TEAM_DOMAIN:issuer,CF_ACCESS_AUD:'rewards'},outboundService:async req=>{assert.equal(req.url,issuer+'/cdn-cgi/access/certs');return Response.json({keys:[jwk]});}});
 try{
 const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 const rpc=async(action,...args)=>{const r=await mf.dispatchFetch('https://api.example.com/test',{method:'POST',body:JSON.stringify({action,args})});const p=await r.json();if(!r.ok)throw new Error(p.error);return p;};
 const sql=async(s,...args)=>(await rpc('sql',s,...args)).results;
 const p=(await rpc('listCatalog'))[0],variantId=p.colorways[0].variantIds.S,giftId=p.colorways[0].variantIds.M,price=p.priceKobo;
 await sql('UPDATE product_variants SET stock=20 WHERE product_id=?',p.id);
 const customer={email:'buyer@example.com',firstName:'Test',lastName:'Buyer',phone:'08000000000',addressLine1:'10 Test Street',addressLine2:'',city:'Lagos',state:'Lagos',countryCode:'NG'};
 const cart=[{variantId,quantity:1}],shippingKobo=200000,base={title:'Nigeria rewards',shippingMinimumKobo:price,giftMinimumKobo:price,giftVariantId:giftId,countries:['NG'],startsAt:'2026-01-01T00:00:00.000Z',endsAt:'2099-01-01T00:00:00.000Z',combineDiscounts:true};
 const quote=(v={})=>rpc('quoteRewards',{subtotalKobo:price,discountKobo:0,hasDiscount:false,countryCode:'NG',shippingKobo,cart,...v});
 const orderArgs=q=>({customer,cart,shippingKobo,expectedTotalKobo:q.totalKobo,expectedRewardSignature:q.signature});
 let campaign=await rpc('saveRewardCampaign',base,'owner@example.com');
 await t.test('new offers paused; invalid and stale edits rejected',async()=>{
 assert.equal(campaign.active,false);assert.equal((await quote()).quote.progress,null);
 await assert.rejects(rpc('saveRewardCampaign',{...base,giftMinimumKobo:-1},'owner@example.com'),/greater/);
 await assert.rejects(rpc('saveRewardCampaign',{...base,endsAt:base.startsAt},'owner@example.com'),/End date/);
 campaign=await rpc('saveRewardCampaign',{...campaign,active:true},'owner@example.com');
 await assert.rejects(rpc('saveRewardCampaign',{...campaign,version:campaign.version-1},'owner@example.com'),/changed/);
 });
 await t.test('before-discount boundary, independent thresholds and country/stock restrictions',async()=>{
 const below=(await quote({subtotalKobo:price-1})).quote;assert.equal(below.progress.shippingRemainingKobo,1);assert.equal(below.gift,null);assert.equal(below.shippingKobo,shippingKobo);
 const equal=(await quote({discountKobo:price/2,hasDiscount:true})).quote;assert.equal(equal.shippingKobo,0);assert.equal(equal.totalKobo,price/2);assert.equal(equal.gift.variantId,giftId);
 assert.equal((await quote({countryCode:'US'})).quote.progress,null);
 const unsupported=(await quote({shippingKobo:null})).quote;assert.equal(unsupported.shippingKobo,null);assert.equal(unsupported.totalKobo,null);
 campaign=await rpc('saveRewardCampaign',{...campaign,giftMinimumKobo:price*2},'owner@example.com');const partial=(await quote()).quote;assert.equal(partial.shippingKobo,0);assert.equal(partial.gift,null);assert.equal(partial.progress.giftRemainingKobo,price);
 campaign=await rpc('saveRewardCampaign',{...campaign,shippingMinimumKobo:0,giftMinimumKobo:null},'owner@example.com');assert.equal((await quote({subtotalKobo:1})).quote.shippingKobo,0);
 campaign=await rpc('saveRewardCampaign',{...campaign,giftMinimumKobo:price,combineDiscounts:false},'owner@example.com');assert.equal((await quote({hasDiscount:true,discountKobo:100})).quote.progress,null);
 campaign=await rpc('saveRewardCampaign',{...campaign,shippingMinimumKobo:price,combineDiscounts:true},'owner@example.com');
 await sql('UPDATE product_variants SET stock=0 WHERE id=?',giftId);const exhausted=(await quote()).quote;assert.equal(exhausted.gift,null);assert.equal(exhausted.progress.giftAvailable,false);assert.equal(exhausted.shippingKobo,0);await sql('UPDATE product_variants SET stock=20 WHERE id=?',giftId);
 });
 await t.test('authoritative totals and changed reward require fresh review',async()=>{
 const q=(await quote()).quote;await assert.rejects(rpc('createPendingOrder',{...orderArgs(q),expectedTotalKobo:1}),/prices/);
 campaign=await rpc('saveRewardCampaign',{...campaign,title:'Updated gift offer'},'owner@example.com');await assert.rejects(rpc('createPendingOrder',orderArgs(q)),/reward changed/);
 const promo={code:'REWARD10',title:'Ten percent',kind:'percent',value:10,minimumKobo:0,minimumQuantity:1,productIds:[],maxUses:0,startsAt:base.startsAt,endsAt:base.endsAt,active:true,version:0};await rpc('savePromotion',promo,'owner@example.com');
 const fresh=(await quote({discountKobo:Math.floor(price*.1),hasDiscount:true})).quote;const order=await rpc('createPendingOrder',{...orderArgs(fresh),promotionCode:promo.code});
 const rows=await sql('SELECT unit_price_kobo,quantity,is_gift FROM order_items WHERE order_id=?',order.id);assert.equal(rows.length,2);assert.equal(rows.find(i=>i.is_gift).unit_price_kobo,0);assert.equal(order.subtotalKobo,price);assert.equal(order.shippingKobo,0);assert.equal(order.totalKobo,price-Math.floor(price*.1));
 await rpc('markOrderPaymentError',order.reference);assert.equal((await sql('SELECT * FROM stock_reservations WHERE order_id=?',order.id)).length,0);
 });
 await t.test('gift and purchased unit of same variant reserve/decrement once as a sum',async()=>{
 campaign=await rpc('saveRewardCampaign',{...campaign,giftVariantId:variantId},'owner@example.com');await sql('UPDATE product_variants SET stock=2 WHERE id=?',variantId);
 const q=(await quote()).quote;assert.equal(q.gift.variantId,variantId);const o=await rpc('createPendingOrder',orderArgs(q));assert.equal((await sql('SELECT quantity FROM stock_reservations WHERE order_id=?',o.id))[0].quantity,2);
 const pay={reference:o.reference,amountKobo:o.totalKobo,eventKey:'gift-paid',eventType:'test',paymentDomain:'live'};await Promise.all([rpc('markOrderPaid',pay),rpc('markOrderPaid',{...pay,eventKey:'gift-repeat'})]);
 assert.equal((await sql('SELECT stock FROM product_variants WHERE id=?',variantId))[0].stock,0);assert.equal((await sql('SELECT * FROM stock_adjustments WHERE reason=?','Sale '+o.reference)).length,1);
 assert.equal((await rpc('salesSignals'))[0].units30,1,'Gift does not inflate bestsellers');
 await rpc('updateOrderStatus',o.reference,'processing');await rpc('updateOrderStatus',o.reference,'shipped');
 const guest=await rpc('getGuestOrder',o.reference,customer.email,'');
 const returned=await rpc('requestReturn',{reference:o.reference,email:customer.email,kind:'exchange',reason:'Both units need a different size.',items:guest.items.map(i=>({id:i.id,quantity:i.quantity}))});
 const ret={id:returned.id,version:0,status:'approved',notes:'Approved',refundKobo:0,refundReference:'',refundStatus:'none',restock:false};await rpc('updateReturn',ret,'owner@example.com');await rpc('updateReturn',{...ret,version:1,status:'received'},'owner@example.com');
 await rpc('allocateExchange',{returnId:returned.id,items:[{originalVariantId:variantId,variantId:giftId,quantity:2}]},'owner@example.com');
 assert.equal((await sql('SELECT stock FROM product_variants WHERE id=?',giftId))[0].stock,18,'Gift and purchased item can be exchanged together');
 await sql('UPDATE product_variants SET stock=1 WHERE id=?',variantId);assert.equal((await quote()).quote.gift,null,'Last unit belongs to paid cart, no phantom gift');
 await sql('UPDATE product_variants SET stock=20 WHERE id=?',variantId);
 });
 await t.test('late gift stock is reviewed and manual allocation checks the combined quantity',async()=>{
 const q=(await quote()).quote,o=await rpc('createPendingOrder',orderArgs(q));await sql('UPDATE product_variants SET stock=1 WHERE id=?',variantId);
 await rpc('markOrderPaid',{reference:o.reference,amountKobo:o.totalKobo,eventKey:'low-gift-stock',eventType:'test'});assert.equal((await rpc('getOrderByReference',o.reference)).status,'paid_stock_review');
 await assert.rejects(rpc('updateOrderStatus',o.reference,'paid'),/stock is still unavailable/);
 await sql('UPDATE product_variants SET stock=2 WHERE id=?',variantId);await rpc('updateOrderStatus',o.reference,'paid');assert.equal((await sql('SELECT stock FROM product_variants WHERE id=?',variantId))[0].stock,0);
 assert.equal((await sql('SELECT * FROM stock_adjustments WHERE reason=?','Sale '+o.reference)).length,1);await sql('UPDATE product_variants SET stock=20 WHERE id=?',variantId);
 });
 await t.test('concurrent buyers cannot reserve the last gift twice',async()=>{
 campaign=await rpc('saveRewardCampaign',{...campaign,giftVariantId:giftId},'owner@example.com');await sql('UPDATE product_variants SET stock=1 WHERE id=?',giftId);
 const q=(await quote()).quote,race=await Promise.allSettled([rpc('createPendingOrder',orderArgs(q)),rpc('createPendingOrder',orderArgs(q))]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
 const won=race.find(r=>r.status==='fulfilled').value;assert.equal((await quote()).quote.gift,null);await rpc('markOrderPaymentError',won.reference);
 });
 let privateReward;
 await t.test('single-use private recipient code is explicit, isolated and atomic',async()=>{
 campaign=await rpc('saveRewardCampaign',{...campaign,active:false},'owner@example.com');
 privateReward=await rpc('saveRewardCampaign',{...base,title:'Selected customer',giftMinimumKobo:null,access:'code',code:'VN-PRIVATE-ONE',recipientEmail:customer.email,maxUses:1,active:true},'owner@example.com');
 assert.equal((await quote()).quote.progress,null);await assert.rejects(quote({code:privateReward.code,email:'wrong@example.com'}),/unavailable/);await assert.rejects(quote({code:privateReward.code,email:customer.email,countryCode:'US'}),/unavailable/);
 const q=(await quote({code:privateReward.code,email:'BUYER@EXAMPLE.COM'})).quote,args={...orderArgs(q),rewardCode:privateReward.code};const race=await Promise.allSettled([rpc('createPendingOrder',args),rpc('createPendingOrder',args)]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
 const o=race.find(r=>r.status==='fulfilled').value;await assert.rejects(quote({code:privateReward.code,email:customer.email}),/unavailable/);
 await rpc('markOrderPaymentError',o.reference);assert.equal((await quote({code:privateReward.code,email:customer.email})).quote.shippingKobo,0,'Failed payment releases use');
 // Expired pending use is allowed to be reserved again, but a later payment must enter review.
 const old=await rpc('createPendingOrder',args);await sql("UPDATE orders SET created_at=datetime('now','-20 minutes') WHERE id=?",old.id);await sql("UPDATE stock_reservations SET expires_at=datetime('now','-1 minute') WHERE order_id=?",old.id);
 const newer=await rpc('createPendingOrder',args);await rpc('markOrderPaid',{reference:newer.reference,amountKobo:newer.totalKobo,eventKey:'newer-paid',eventType:'test'});
 await rpc('markOrderPaid',{reference:old.reference,amountKobo:old.totalKobo,eventKey:'late-paid',eventType:'test'});assert.equal((await rpc('getOrderByReference',old.reference)).status,'paid_stock_review');
 });
 await t.test('public quote leaks no private codes; canonical delivery and duplicate validation',async()=>{
 const settings=await rpc('getCommerceSettings');await rpc('saveCommerceSettings',{...settings,shippingZones:[{state:'*',feeKobo:shippingKobo,estimate:'3–5 days'}]});
 const request=body=>mf.dispatchFetch('https://api.example.com/api/rewards/quote',{method:'POST',headers:{Origin:'https://vantanoir.store','Content-Type':'application/json'},body:JSON.stringify(body)});
 const r=await request({cart,countryCode:'NG',state:'Lagos'});assert.equal(r.status,200);const q=await r.json();assert.equal(q.totalKobo,price+shippingKobo);assert.equal(q.progress,null);assert.equal(JSON.stringify(q).includes(privateReward.code),false);assert.equal(JSON.stringify(q).includes(customer.email),false);
 assert.equal((await request({cart:[...cart,...cart]})).status,400);assert.equal((await request({cart:[{variantId,quantity:1.5}]})).status,400);
 assert.equal((await (await request({cart,countryCode:'US',state:'NY'})).json()).totalKobo,null);
 });
 await t.test('lucky draw unique, paused and idempotent; owner-only read/write',async()=>{
 const input={templateId:campaign.id,emails:['a@example.com','b@example.com','A@example.com','c@example.com'],count:2,drawId:crypto.randomUUID()};
 const results=await Promise.all([rpc('drawRewardWinners',input,'owner@example.com'),rpc('drawRewardWinners',input,'owner@example.com')]);assert.deepEqual(results[0],results[1]);assert.equal(new Set(results[0].winners.map(w=>w.email)).size,2);
 for(const w of results[0].winners){const c=JSON.parse((await sql('SELECT config_json FROM reward_campaigns WHERE id=?',w.id))[0].config_json);assert.equal(c.active,false);assert.equal(c.maxUses,1);assert.equal(c.recipientEmail,w.email);}
 await assert.rejects(rpc('drawRewardWinners',{...input,drawId:crypto.randomUUID(),count:4},'owner@example.com'),/unique/);
 await rpc('saveStaff',{email:'analyst@example.com',role:'analyst',active:true},'owner@example.com');const owner=await jwt('owner@example.com'),analyst=await jwt('analyst@example.com');
 const req=(token,body)=>mf.dispatchFetch('https://api.example.com/api/admin/operations?resource=promotions',{method:body?'POST':'GET',headers:{'cf-access-jwt-assertion':token,Origin:'https://api.example.com','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await req(analyst)).status,403);assert.equal((await req(analyst,{action:'reward',data:base})).status,403);assert.equal((await req(analyst,{action:'reward-draw',data:input})).status,403);const read=await req(owner);assert.equal(read.status,200);assert.ok((await read.json()).campaigns.length>=4);
 });
 }finally{await mf.dispose();}
});
