import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['lib/product-specs.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {shopperProductDetails,resolvedProductDetails,shopperFabric}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('public specifications omit internal workflow copy without changing the manufacturing record',()=>{
  const fabric='approved MATERIALS: 100% cotton twill 180 GSM; ivory collar. Use exact approved master logo vectors; mockup logos are visual approximations. Approve fit tests before bulk.';
  const features='Camp collar and matte black buttons.\nARTWORK: City illustration, L envelope 50 x 33 cm.\nBRANDING: Engraved buttons.\nEstimated size-L mass 350 g, unweighed. Retail price is an unapproved specification. Corrected concept board attached; separate Front/Back/Left/Right images still required before publishing.';
  const p={name:'Shirt',category:'Shirts and polos',details:{fabric,features,availability:'preview',qualityTargets:'Sample tests incomplete',care:'Do not bleach.'}};
  const before=JSON.stringify(p),publicDetails=shopperProductDetails(p),manufacturing=resolvedProductDetails(p);
  assert.equal(publicDetails.fabric,'100% cotton twill 180 GSM; ivory collar.');
  assert.equal(publicDetails.features,'Camp collar and matte black buttons.');
  assert.equal(publicDetails.care,'Do not bleach.');
  assert.equal(publicDetails.availability,'preview');
  assert.equal(manufacturing.fabric,fabric);assert.equal(manufacturing.features,features);
  assert.equal(manufacturing.qualityTargets,'Sample tests incomplete');assert.equal(JSON.stringify(p),before);
});
test('ordinary fabric details and material qualifications remain intact',()=>{
  for(const text of ['80% wool / 20% nylon. Leather sleeves.','Proposed cotton blend; composition not yet tested.',''])assert.equal(shopperFabric(text),text);
});
