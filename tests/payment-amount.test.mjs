import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['lib/payment-amount.ts'],outfile:'work/payment-amount.mjs',bundle:true,format:'esm',platform:'node'});
const {confirmedPaymentFee}=await import('../work/payment-amount.mjs');
test('verified exact payments and documented customer-paid fees reconcile without accepting arbitrary differences',()=>{
 assert.equal(confirmedPaymentFee(2000000,2000000),0);
 assert.equal(confirmedPaymentFee(2000000,2040609,2000000,40609),40609);
 assert.equal(confirmedPaymentFee(2000000,2040609,'2000000',40609),40609);
 for(const args of [[2000000,1999999],[2000000,2000001],[2000000,2040609,2000000,40000],[2000000,2040609,1999999,40610],[2000000,2040609,null,40609],[2000000,2040609,2000000,-1],[2000000,2040609,2000000,Infinity],[2000000,2000000,1000000,0]])assert.throws(()=>confirmedPaymentFee(...args),/mismatch/);
});
