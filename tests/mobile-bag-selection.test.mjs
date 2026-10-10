import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({entryPoints:['mobile/src/bag-selection.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {variantStock,bagPartition}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const bag=[{variantId:'a',quantity:2},{variantId:'b',quantity:1}];
test('checkout consumes only selected lines and preserves unselected bag quantities',()=>{assert.deepEqual(bagPartition(bag,['a']),{checkout:[bag[0]],remaining:[bag[1]]});assert.deepEqual(bagPartition(bag,[]),{checkout:[],remaining:bag});assert.deepEqual(bagPartition(bag,['a','b']).remaining,[]);assert.equal(bag[0].quantity,2);});
test('deleted selections cannot become checkout items',()=>assert.deepEqual(bagPartition(bag,['deleted']).checkout,[]));
test('stock resolves exact variant, and missing, draft and sold-out pieces are unavailable',()=>{const p={colorways:[{variantIds:{L:'a',M:'b'},stock:{L:3,M:0}}]};assert.equal(variantStock(bag[0],[p]),3);assert.equal(variantStock(bag[1],[p]),0);assert.equal(variantStock(bag[0],[]),0);assert.equal(variantStock(bag[0],[{...p,details:{availability:'preview'}}]),0);});
