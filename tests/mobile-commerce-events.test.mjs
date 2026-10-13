import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
test('analytics counts merchandise separately from delivery and excludes unpaid orders and contact data',async()=>{
 const result=await build({entryPoints:['mobile/src/commerce-events.ts'],bundle:true,write:false,format:'esm',platform:'node'});
 const {shoppingPayload,purchasePayload}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 assert.equal(shoppingPayload([{productId:'one',name:'Tee',priceKobo:200000,quantity:2}]).value,4000);
 const order={reference:'test-reference',paymentStatus:'paid',totalKobo:430000,shippingKobo:50000,discountKobo:20000,email:'private@example.com',phone:'+2340000000000',items:[{variantId:'one',productName:'Tee',color:'Black',size:'M',quantity:2,unitPriceKobo:200000}]};
 assert.equal(purchasePayload({...order,paymentStatus:'pending'}),null);
 const payload=purchasePayload(order);assert.equal(payload.value,3800);assert.equal(payload.shipping,500);assert.equal(payload.transaction_id,order.reference);
 assert.doesNotMatch(JSON.stringify(payload),/private@example|234000/);
});
