import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
async function load(path){const b=await build({entryPoints:[path],bundle:true,write:false,platform:'node',format:'esm'});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));}
const {SHOP_COLLECTIONS,matchesShopCollection,productDrop}=await load('lib/shop-collections.ts');
const {productLink,collectionLink,matchesAudience}=await load('lib/catalog-browsing.ts');
const products=JSON.parse(readFileSync('portable/catalog-snapshot.json'));
test('All eight collections have real products; Women contains every women’s piece and no others',()=>{
  for(const collection of SHOP_COLLECTIONS) assert.ok(products.some(p=>matchesShopCollection(p,collection)),collection);
  assert.deepEqual(products.filter(p=>matchesShopCollection(p,'Women')),products.filter(p=>p.details?.audience==='women'));
  for(const collection of SHOP_COLLECTIONS) for(const audience of ['men','women','unisex']) {
    assert.ok(products.filter(p=>matchesShopCollection(p,collection)&&matchesAudience(p,audience)).every(p=>(p.details?.audience??'unisex')===audience));
  }
});
test('Product types and legacy links remain separate from broad collections',()=>{
  const jerseys=products.filter(p=>p.category==='Jerseys');
  for(const p of jerseys) {assert.ok(matchesShopCollection(p,'Jerseys'));assert.ok(matchesShopCollection(p,'C03'));}
  assert.ok(products.filter(p=>p.category==='Windbreaker sets').every(p=>matchesShopCollection(p,'Outerwear')));
  for(const p of products) assert.equal(matchesShopCollection(p,'All'),true);
});
test('Drop options exclude import batches and sections, and honour renamed ranges',()=>{
  assert.equal(productDrop({id:'vn-stealth'}),'STEALTH');
  assert.equal(productDrop({id:'new',details:{collection:'Batch 5 — Womens Elevated Street & Outerwear'}}),'');
  assert.equal(productDrop({id:'new',details:{collection:'Tops'}}),'');
  assert.equal(productDrop({id:'new',details:{collection:'Noir 02 — After Hours'}}),'Noir 02 — After Hours');
  assert.equal(productDrop({id:'new',details:{collection:'Batch 1'}},[{source:'Batch 1',label:'VD'}]),'VD');
});
test('Deep links retain independent collection, product type, drop and other filters',()=>{
  const context={audience:'women',category:'Activewear',productType:'C26',collection:'Motion',query:'flare',color:'Black',size:'M',price:'under',sort:'low',saved:true};
  for(const link of [collectionLink(context),productLink('flare','black',context)]) {
    const params=new URL(link,'https://example.test').searchParams;
    for(const [key,value] of Object.entries({audience:'women',category:'Activewear',productType:'C26',collection:'Motion',q:'flare',color:'Black',size:'M',price:'under',sort:'low',saved:'1'})) assert.equal(params.get(key),value);
  }
});
