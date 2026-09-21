import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
async function load(path){const b=await build({entryPoints:[path],bundle:true,write:false,platform:'node',format:'esm'});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));}
const {matchesAudience,productLink,collectionLink}=await load('lib/catalog-browsing.ts');
const {catalogStyles}=await load('lib/catalog-styles.ts');
const {individualProductViews}=await load('lib/catalog-images.ts');
const products=JSON.parse(readFileSync('portable/catalog-snapshot.json'));
test('Women excludes Men, Unisex and unspecified products through grouped catalogue',()=>{
 const women=catalogStyles(products).filter(p=>matchesAudience(p,'women'));
 assert.ok(women.length>200);assert.ok(women.every(p=>p.details.audience==='women'));
 for(const audience of ['men','unisex',undefined])assert.equal(matchesAudience({details:{audience}},'women'),false);
});
test('Product and collection links retain department and category',()=>{
 const context={audience:'women',category:'Jerseys',collection:'Womens Batch 01',query:'mesh'};
 for(const link of [productLink('mesh-jersey','bone-black',context),collectionLink(context)]){
  const url=new URL(link,'https://example.test');for(const [key,value] of Object.entries({audience:'women',category:'Jerseys',collection:'Womens Batch 01',q:'mesh'}))assert.equal(url.searchParams.get(key),value);
 }
});
test('Grouped colours preserve original inventory identities and department',()=>{
 for(const style of catalogStyles(products))for(const color of style.colorways.filter(c=>c.sourceProductId)){
  const original=products.find(p=>p.id===color.sourceProductId);assert.equal(original.details.audience,style.details.audience);
  assert.equal(color.sourceSlug,original.slug);assert.deepEqual(color.stock,original.colorways.find(c=>c.slug===color.slug).stock);
  assert.ok(Object.values(color.variantIds).every(id=>id.startsWith(original.id+'-')));
 }
});
test('Every replaced composite has three different selectable view files',()=>{
 const mappings=JSON.parse(readFileSync('data/catalogue-separated-views.json'));
 assert.ok(Object.keys(mappings).length>=197);
 for(const [old,views] of Object.entries(mappings).filter(([url])=>url.includes("-views."))){
  assert.deepEqual(views.map(v=>v.view),['front','back','side']);assert.equal(new Set(views.map(v=>v.imageUrl)).size,3);
  const source={name:'Reference',color:'Black',imageUrl:old,imageAlt:'Reference',images:[{color:'Black',imageUrl:old}],colorways:[{name:'Black',imageUrl:old}]};
  const fixed=individualProductViews(source);assert.equal(fixed.images.length,3);assert.equal(fixed.imageUrl,views[0].imageUrl);
 }
});
test('Reported jersey has five genuine colours with three views each and no invented stock',()=>{
 const p=products.find(p=>p.id==='vn-pdf-p05-2-r3-c3');assert.equal(p.colorways.length,5);
 for(const c of p.colorways){const views=p.images.filter(i=>i.color===c.name);assert.equal(views.length,3);assert.equal(new Set(views.map(i=>i.imageUrl)).size,3);assert.ok(Object.values(c.stock).every(n=>n===0));}
});

test('product and return links preserve every shopping filter',()=>{
 const context={audience:'women',category:'Jerseys',collection:'VD',query:'mesh',color:'Black / Platinum',size:'XS',price:'under',sort:'low',saved:true};
 for(const link of [collectionLink(context),productLink('mesh','black',context)]) {
  const url=new URL(link,'https://example.test');
  for(const [key,value] of Object.entries({audience:'women',category:'Jerseys',collection:'VD',q:'mesh',color:'Black / Platinum',size:'XS',price:'under',sort:'low',saved:'1'})) assert.equal(url.searchParams.get(key),value);
 }
});
