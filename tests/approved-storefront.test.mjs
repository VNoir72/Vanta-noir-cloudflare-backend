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

const viewsBuild=await build({entryPoints:['lib/catalog-images.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {individualProductViews}=await import('data:text/javascript;base64,'+Buffer.from(viewsBuild.outputFiles[0].text).toString('base64'));
const {readFileSync,existsSync}=await import('node:fs');
const reviewed=JSON.parse(readFileSync('data/catalogue-approved-view-updates.json','utf8'));
test('reviewed colourways have four existing assets, correct labels and idempotent conversion',()=>{
 for(const row of reviewed){
  const product={id:row.productId,name:'Garment',imageAlt:'Garment',imageUrl:row.legacyFront,color:row.color,colorways:[{name:row.color,imageUrl:row.legacyFront}],images:row.legacyImages.map(imageUrl=>({color:row.color,imageUrl,imageAlt:'Side'}))};
  const result=individualProductViews(product);
  assert.equal(result.images.length,4,row.productId+' '+row.color);
  assert.deepEqual(result.images.map(i=>i.imageAlt.match(/(front|back|left|right) view/)[1]),['front','back','left','right']);
  for(const path of Object.values(row.views))assert.ok(existsSync('public'+path),path);
  assert.deepEqual(individualProductViews(result),result);
  const custom={...product,imageUrl:'/custom.webp',colorways:[{name:row.color,imageUrl:'/custom.webp'}],images:[{color:row.color,imageUrl:'/custom.webp',imageAlt:'Custom'}]};
  assert.deepEqual(individualProductViews(custom),custom);
 }
});
