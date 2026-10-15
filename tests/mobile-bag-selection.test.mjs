import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({entryPoints:['mobile/src/bag-selection.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {variantStock,bagPartition,refreshBagDetails,isBagRefreshNotice}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const bag=[{variantId:'a',quantity:2},{variantId:'b',quantity:1}];
test('checkout consumes only selected lines and preserves unselected bag quantities',()=>{assert.deepEqual(bagPartition(bag,['a']),{checkout:[bag[0]],remaining:[bag[1]]});assert.deepEqual(bagPartition(bag,[]),{checkout:[],remaining:bag});assert.deepEqual(bagPartition(bag,['a','b']).remaining,[]);assert.equal(bag[0].quantity,2);});
test('deleted selections cannot become checkout items',()=>assert.deepEqual(bagPartition(bag,['deleted']).checkout,[]));
test('stock resolves exact variant, and missing, draft and sold-out pieces are unavailable',()=>{const p={colorways:[{variantIds:{L:'a',M:'b'},stock:{L:3,M:0}}]};assert.equal(variantStock(bag[0],[p]),3);assert.equal(variantStock(bag[1],[p]),0);assert.equal(variantStock(bag[0],[]),0);assert.equal(variantStock(bag[0],[{...p,details:{availability:'preview'}}]),0);});

test('catalogue refresh updates prices and imagery without deleting unavailable saved pieces',()=>{
 const saved=[{variantId:'a',quantity:2,priceKobo:100,imageUrl:'old'},{variantId:'missing',quantity:1,priceKobo:200}];
 const products=[{id:'p',name:'Jacket',priceKobo:350,colorways:[{name:'Black',imageUrl:'studio',variantIds:{L:'a'},stock:{L:3}}]}];
 const refreshed=refreshBagDetails(saved,products);
 assert.equal(refreshed[0].priceKobo,350);assert.equal(refreshed[0].imageUrl,'studio');assert.equal(refreshed[0].quantity,2);
 assert.deepEqual(refreshed[1],saved[1]);assert.equal(saved[0].priceKobo,100);
 assert.equal(isBagRefreshNotice('An item is unavailable. Refresh your bag.'),true);
 assert.equal(isBagRefreshNotice('Check your payment before retrying.'),false);
});
