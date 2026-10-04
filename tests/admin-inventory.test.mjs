import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const output=await build({entryPoints:['lib/admin-inventory.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {parseStock,matchesStockFilter,stockTotals}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const row=(stock,extras={})=>({id:'a',productId:'p',productName:'Set',sku:'a',color:'Black',size:'L',stock,reserved:0,available:stock,active:1,productStatus:'published',priceKobo:100,...extras});
test('blank, fractional, negative and excessive stock cannot become a saved zero',()=>{for(const value of ['', ' ', '-1','1.2','1e3','NaN','100001'])assert.equal(parseStock(value),null);assert.equal(parseStock('0'),0);assert.equal(parseStock('100000'),100000);});
test('low stock counts available active published variants, excluding sold-out and archived stock',()=>{assert.equal(matchesStockFilter(row(0),'low'),false);assert.equal(matchesStockFilter(row(2),'low'),true);assert.equal(matchesStockFilter(row(2,{productStatus:'archived'}),'low'),false);assert.equal(matchesStockFilter(row(2,{active:0}),'low'),false);assert.equal(matchesStockFilter(row(5,{reserved:4,available:1}),'low'),true);});
test('totals separate recorded, reserved and sellable units, excluding draft and archived units',()=>{assert.deepEqual(stockTotals([row(8,{reserved:3,available:5}),row(0),row(3),row(20,{productStatus:'draft'}),row(99,{productStatus:'archived'})]),{onHand:11,reserved:3,available:8,low:1,out:1});assert.equal(matchesStockFilter(row(1,{productStatus:'draft'}),'all'),true);});
