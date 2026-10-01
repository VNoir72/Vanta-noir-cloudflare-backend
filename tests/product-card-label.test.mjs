import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
const result=await build({entryPoints:['lib/product-card-label.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {productCardLabel}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const products=JSON.parse(await readFile('portable/catalog-snapshot.json','utf8'));
test('photographed track sets use garment labels, not the broad denim category',()=>{
 for(const id of ['vn-pdf-p07-2-r1-a4','vn-pdf-p07-2-r1-a5']) assert.equal(productCardLabel(products.find(p=>p.id===id)),'Stand-collar Track Set');
 assert.equal(productCardLabel(products.find(p=>p.id==='vn-pdf-p06-3-r1-c5')),'Knit track set');
});
test('admin garment type takes precedence; names provide a nonempty fallback',()=>{
 assert.equal(productCardLabel({id:'custom',name:'Noir',category:'Tops',details:{garmentType:'Rugby shirt'}}),'Rugby shirt');
 assert.equal(productCardLabel({id:'custom',name:'03 Hooded Performance Tracksuit',category:'Sets'}),'Hooded Performance Tracksuit');
 for(const p of products) assert.ok(productCardLabel(p).length,p.id);
});
