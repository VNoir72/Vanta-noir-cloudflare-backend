import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';

// Execute the actual storefront matcher with real catalogue categories.
const source=await readFile('app/storefront.tsx','utf8');
const matcher=source.match(/  const matchesCategory=([^\n]+);/)[1];
const compiled=await build({stdin:{contents:`import {isNewArrival,isPreview,bestSellerUnits} from './lib/merchandising';import {categoryFor} from './lib/shop-categories';const merchandising={sales:[],stockBadgesEnabled:false};export const matchesCategory=${matcher};`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {matchesCategory}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const products=JSON.parse(await readFile('portable/catalog-snapshot.json','utf8'));
const {categories}=JSON.parse(await readFile('data/catalogue-source.json','utf8'));
test('Shop all retains every catalogue record including previews and proposed prices',()=>{
 assert.ok(products.length>600);
 assert.equal(products.filter(p=>matchesCategory(p,'All')).length,products.length);
 for(const category of categories){
  for(const p of products.filter(p=>p.category===category.name)){
   assert.equal(matchesCategory(p,category.id),true,p.id);
   assert.equal(matchesCategory(p,category.section),true,p.id);
  }
 }
});
test('Best sellers has no invented sales and New arrivals remains an optional filter',()=>{
 for(const p of products){
  const preview=p.details?.availability==='preview'||p.details?.priceStatus==='proposed';
  assert.equal(matchesCategory(p,'Best sellers'),false);
  if(preview)assert.equal(matchesCategory(p,'New arrivals'),false);
 }
 assert.doesNotMatch(source,/<HomepageMerchandising\b/);
});
