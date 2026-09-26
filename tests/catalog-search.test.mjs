import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
async function load(path) { const result=await build({entryPoints:[path],bundle:true,write:false,platform:'node',format:'esm'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64')); }
const {catalogSearchScore,shopperCollectionLabel}=await load('lib/catalog-search.ts');
const {colourFamily,matchesColour}=await load('lib/catalog-colours.ts');
const color={name:'Jet Black'};
test('cap search excludes capsule tees but accepts caps and multiword colour searches',()=>{
  const cap={name:'Face Cap',category:'Headwear',description:'Winged logo cap',details:{}};
  const tee={name:'Baby Tee',category:'T-shirts',description:'Art capsule design',details:{collection:'Art Capsule'}};
  assert.ok(catalogSearchScore(cap,color,'caps'));
  assert.ok(catalogSearchScore(cap,color,'black cap'));
  assert.equal(catalogSearchScore(tee,color,'cap'),0);
  assert.equal(catalogSearchScore(cap,color,'green cap'),0);
  assert.ok(catalogSearchScore({name:'Football Jersey',description:'',category:'Jerseys'},color,'jerseys'));
});
test('browse labels hide batch jargon without changing catalogue identities',()=>{
  assert.equal(shopperCollectionLabel('Batch 4 — Mens Pattern & Street'),'Men’s Pattern & Street');
  assert.equal(shopperCollectionLabel('Noir / Femme 01 — After Dark'),'Noir / Femme 01 — After Dark');
});
test('broad colour filters preserve exact legacy links and colourway names',()=>{
  assert.equal(colourFamily('Jet Black / Bone Ink'),'Black');
  assert.equal(colourFamily('Dark Burgundy / Black'),'Burgundy');
  assert.equal(matchesColour('Jet Black / Bone Ink','Black'),true);
  assert.equal(matchesColour('Jet Black/Bone Ink','Jet Black / Bone Ink'),true);
  assert.equal(matchesColour('Dark Burgundy / Black','Black'),false);
});
