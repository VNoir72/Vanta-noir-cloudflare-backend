import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
async function load(path){const result=await build({entryPoints:[path],bundle:true,write:false,platform:'node',format:'esm'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const {pairedProducts,approvedLooks,displayCutout}=await load('lib/product-pairings.ts');
const {productDetails}=await load('lib/product-details.ts');
const main={id:'polo',details:{pairedProductIds:['trousers','hidden','polo','trousers'],lookName:'Signal'}};
const trouser={id:'trousers',colorways:[{name:'Black'}]},unrelated={id:'cap',details:{collection:'Signal'}};
test('only owner-selected public products appear; duplicates and self are excluded',()=>assert.deepEqual(pairedProducts(main,[main,trouser,unrelated]),[trouser]));
test('same collection alone never creates a pairing or a look',()=>{assert.deepEqual(pairedProducts(unrelated,[main,trouser,unrelated]),[]);assert.deepEqual(approvedLooks([unrelated]),[])});
test('a look requires a public companion; deleted/private links cannot leak',()=>{assert.deepEqual(approvedLooks([main]),[]);assert.equal(approvedLooks([main,trouser])[0].products.length,2)});
test('display image is selected by exact colour without replacing another colour',()=>{const p={details:{displayImages:[{color:'Burgundy',imageUrl:'https://example.com/polo.webp'}]}};assert.equal(displayCutout(p,'Black'),undefined);assert.equal(displayCutout(p,'Burgundy'),'https://example.com/polo.webp')});
test('details retain pairings and reject executable display URLs',()=>{const details=productDetails({lookName:'Signal',pairedProductIds:['trousers'],displayImages:[{color:'Burgundy',imageUrl:'https://example.com/polo.webp'}]});assert.deepEqual(details.pairedProductIds,['trousers']);assert.equal(details.displayImages.length,1);assert.equal(productDetails({displayImages:[{color:'Burgundy',imageUrl:'javascript:alert(1)'}]}).displayImages,undefined)});
test('prepared cutouts track exact source images and admin overrides win',async()=>{
 const {readFile}=await import('node:fs/promises');const assets=JSON.parse(await readFile('lib/floating-assets.json','utf8'));const [source,hash]=Object.entries(assets)[0];
 const p={colorways:[{name:'Black',imageUrl:source},{name:'Cream',imageUrl:'/new-cream.webp'}]};
 assert.equal(displayCutout(p,'Black'),`/images/floating/${hash}.webp`);
 assert.equal(displayCutout(p,'Cream'),undefined);
 p.colorways[0].imageUrl='/replacement.webp';assert.equal(displayCutout(p,'Black'),undefined);
 p.details={displayImages:[{color:'Black',imageUrl:'/owner-approved.webp'}]};assert.equal(displayCutout(p,'Black'),'/owner-approved.webp');
});
