import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
const products=JSON.parse(fs.readFileSync('portable/catalog-snapshot.json','utf8'));
const targets=JSON.parse(fs.readFileSync('data/garment-measurements.json','utf8'));
const bundle=await build({entryPoints:['lib/sizing.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {referenceSizeGuide,sizeGuideSchema,resolveDevelopmentTarget}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('every catalogued style has finite five-size garment targets or explicit accessory dimensions',()=>{
 for(const p of products){const t=targets[p.id];assert.ok(t,p.id);assert.equal(t.status,'proposed');
  assert.ok(t.blocks.length || t.accessory,p.id);
  for(const b of t.blocks)for(const r of b.rows){assert.equal(r.values.length,5,p.id+' '+r.label);assert.ok(r.values.every(v=>Number.isFinite(v)&&v>0));}
  const guide=referenceSizeGuide(p.id);if(t.blocks.length){assert.ok(sizeGuideSchema.safeParse(guide).success,p.id);for(const s of guide.sections)assert.deepEqual(s.rows.map(r=>r.size),['S','M','L','XL','XXL']);}
 }
});
test('baggy garments are never assigned bag dimensions; cropped and adult fits remain distinct',()=>{
 for(const p of products.filter(p=>/baggy/i.test(p.name)))assert.equal(targets[p.id].accessory,null,p.name);
 assert.equal(targets['vn-stealth'].blocks[0].code,'T01');
 assert.equal(targets['vn-season01-26'].blocks[0].code,'B16');
 assert.equal(targets['vn-vd-p02-2-20'].blocks[0].code,'W11');
});
test('complete development tables do not override merchant charts or intentionally hidden measurements',()=>{
 const id='vn-stealth';
 assert.equal(resolveDevelopmentTarget({id}).revision,'VN-MEAS-02');
 assert.equal(resolveDevelopmentTarget({id,details:{sizeGuide:{status:'reference',notes:'Hide until samples arrive',sections:[]}}}),null);
 assert.equal(resolveDevelopmentTarget({id,details:{sizeChart:[{size:'M',chest:65}]}}),null);
 const edited=structuredClone(referenceSizeGuide(id));edited.sections[0].rows[0].chest=63;
 assert.equal(resolveDevelopmentTarget({id,details:{sizeGuide:edited}}),null);
 const confirmed=structuredClone(edited);confirmed.status='confirmed';
 assert.equal(resolveDevelopmentTarget({id,details:{sizeGuide:confirmed}}),null);
});
test('VD garment nouns select matching categories and both pieces of coordinated sets',()=>{
 const byId=new Map(products.map(p=>[p.id,p]));
 const expected={
  'vn-pdf-p15-3-r1-c3':['Jackets and coats',['W14']],
  'vn-pdf-p09-2-r3-c2':['Knitwear',['W19']],
  'vn-pdf-p09-2-r4-c1':['Casual and denim sets',['W13','W09']],
  'vn-pdf-p09-2-r4-a3':['Dresses',['W15']],
  'vn-pdf-p09-2-r3-a1':['Knitwear',['W19']],
  'vn-pdf-p09-2-r4-a4':['Casual and denim sets',['W14','W10']],
  'vn-pdf-p15-3-r2-c3':['Shirts and polos',['W13']],
  'vn-pdf-p06-2-r4-c4':['Jackets and coats',['W14']],
  'vn-pdf-p11-2-r2-c4':['Shirts and polos',['T12']],
 };
 for(const [id,[category,codes]] of Object.entries(expected)){
  if(!byId.has(id))continue; // A failed image review may temporarily hold a style.
  assert.equal(byId.get(id).category,category,id);
  assert.deepEqual(targets[id].blocks.map(b=>b.code),codes,id);
 }
});
