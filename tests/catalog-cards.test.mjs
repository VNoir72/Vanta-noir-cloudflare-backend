import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['lib/catalog-cards.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {stableProductCards}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const colors=['black','olive','bone'];
const products=['hoodie','beanie','belt'].map(id=>({id,colorways:colors.map(slug=>({slug,name:slug,imageUrl:`/${id}-${slug}.webp`}))}));
const entries=colors.flatMap(slug=>products.map(product=>({product,color:product.colorways.find(c=>c.slug===slug),key:`${product.id}:${slug}`})));
test('switching accessory colours preserves every card and its position',()=>{
 for(const product of products)for(const slug of colors){
 const cards=stableProductCards(entries,{[product.id]:slug});
 assert.deepEqual(cards.map(c=>c.product.id),['hoodie','beanie','belt']);
 const card=cards.find(c=>c.product.id===product.id);
 assert.equal(card.color.imageUrl,`/${product.id}-${slug}.webp`);
 assert.equal(cards.length,3);
 }
});
test('selection stays scoped to the product and does not expand filtered results',()=>{
 const cards=stableProductCards(entries.filter(e=>e.product.id==='belt'&&e.color.slug==='olive'),{belt:'black',beanie:'bone'});
 assert.equal(cards.length,1);assert.equal(cards[0].product.id,'belt');assert.equal(cards[0].color.imageUrl,'/belt-olive.webp');
 assert.equal(stableProductCards(entries,{belt:'missing'}).find(c=>c.product.id==='belt').color.slug,'black');
});
