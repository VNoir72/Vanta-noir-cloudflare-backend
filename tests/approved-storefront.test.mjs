import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['lib/merchandising.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {confirmedSoldOut,isNewArrival,bestSellerScore}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const p={id:'a',details:{availability:'in_stock',priceStatus:'approved'},colorways:[{stock:{S:0,M:0}}]};
test('sold-out requires known zeros, and respects preview and preorder',()=>{
 assert.equal(confirmedSoldOut(p),true);
 for(const stock of [{},{'Size pending':0},{S:NaN},{S:0,M:2}])assert.equal(confirmedSoldOut(p,stock),false);
 for(const availability of ['preview','preorder'])assert.equal(confirmedSoldOut({...p,details:{...p.details,availability}}),false);
 assert.equal(confirmedSoldOut({...p,details:{...p.details,priceStatus:'proposed'}}),false);
});
test('newly uploaded products qualify automatically; updates do not reset age',()=>{
 const now=Date.parse('2026-10-03T12:00:00Z');
 assert.equal(isNewArrival({...p,createdAt:'2026-10-02 12:00:00'},now),true);
 assert.equal(isNewArrival({...p,createdAt:'2026-01-01 12:00:00',updatedAt:'2026-10-02 12:00:00'},now),false);
 assert.equal(isNewArrival({...p,createdAt:'2026-10-02T12:00:00Z',details:{...p.details,releaseDate:'2026-10-04'}},now),false);
});
test('recent sales boost ranking and grouped colourways are counted once',()=>{
 const data={sales:[{productId:'a',units30:10,units7:1},{productId:'b',units30:8,units7:7}]};
 assert.ok(bestSellerScore({...p,id:'b'},data)>bestSellerScore(p,data));
 assert.equal(bestSellerScore({...p,colorways:[{sourceProductId:'a'},{sourceProductId:'b'},{sourceProductId:'b'}]},data),26);
});
