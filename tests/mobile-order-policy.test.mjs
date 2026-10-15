import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({entryPoints:['mobile/src/order-policy.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {hasPaidReceipt,inOrderGroup}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
test('receipts require confirmed payment, regardless of fulfilment status',()=>{
 for(const paymentStatus of ['pending','failed','cancelled',''])assert.equal(hasPaidReceipt({paymentStatus,status:'completed'}),false);
 for(const status of ['paid','processing','shipped','delivered','completed'])assert.equal(hasPaidReceipt({paymentStatus:'paid',status}),true);
});
test('all orders includes processing, completed and expired records',()=>{
 for(const [status,paymentStatus,group] of [['processing','paid','Processing'],['paid','paid','Processing'],['delivered','paid','Delivered'],['completed','paid','Delivered'],['expired','pending','Expired'],['pending_payment','pending','To pay']]){
 const order={status,paymentStatus};assert.equal(inOrderGroup(order,'All'),true);assert.equal(inOrderGroup(order,group),true);
 }
});
test('paid orders cannot re-enter payment or expiry tabs from stale status',()=>{
 assert.equal(inOrderGroup({status:'expired',paymentStatus:'paid'},'Expired'),false);
 assert.equal(inOrderGroup({status:'pending_payment',paymentStatus:'paid'},'To pay'),false);
});
test('To pay includes unpaid and failed attempts but excludes terminal and paid orders',()=>{for(const paymentStatus of ['pending','unpaid','failed','abandoned'])assert.equal(inOrderGroup({status:'pending',paymentStatus},'To pay'),true);for(const status of ['expired','cancelled','refunded'])assert.equal(inOrderGroup({status,paymentStatus:'pending'},'To pay'),false);assert.equal(inOrderGroup({status:'processing',paymentStatus:'paid'},'To pay'),false);});

test('packed and ready-to-ship paid orders remain in Processing',()=>{for(const status of ['packed','ready_to_ship','preparing_to_ship'])assert.equal(inOrderGroup({status,paymentStatus:'paid'},'Processing'),true);});
