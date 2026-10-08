import test from 'node:test';
import assert from 'node:assert/strict';
import {detailsForSave,publicPricing} from '../lib/publication-policy.mjs';
const approved={availability:'in_stock',priceStatus:'approved',suggestedPriceNgn:150000,fabric:'Custom cotton'};
test('publishing new garments and editing previews cannot bypass owner launch',()=>{
 for(const existing of [null,{status:'draft',details:approved},{status:'published',details:{...approved,availability:'preview'}},{status:'published',details:{...approved,priceStatus:'proposed'}}]){
  const result=detailsForSave(existing,'published',approved);
  assert.equal(result.availability,'preview');assert.equal(result.priceStatus,'proposed');assert.equal(result.fabric,'Custom cotton');
 }
});
test('already launched products retain approved sale settings; withdrawing requires a fresh launch',()=>{
 const existing={status:'published',details:approved};
 assert.deepEqual(detailsForSave(existing,'published',approved),approved);
 for(const status of ['draft','archived'])assert.equal(detailsForSave(existing,status,approved).availability,'preview');
});
test('public previews redact internal and suggested prices, even with an approved internal price',()=>{
 for(const details of [{...approved,availability:'preview'},{...approved,priceStatus:'proposed'}]){
  const visible=publicPricing(15000000,details);
  assert.equal(visible.priceKobo,0);assert.equal(visible.details.suggestedPriceNgn,0);assert.equal(visible.details.priceStatus,'proposed');assert.equal(visible.details.fabric,'Custom cotton');
 }
 assert.deepEqual(publicPricing(15000000,approved),{priceKobo:15000000,details:approved});
});
