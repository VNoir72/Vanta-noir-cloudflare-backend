import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildTechPack,renderTechPackHTML} from '../lib/tech-packs.mjs';
test('owner approval renders approved measurements without claiming physical test results',()=>{
 const product={id:'own',name:'Garment',details_json:JSON.stringify({features:'Retail price is an unapproved draft proposal, not a manufacturing quote.',specificationStatus:'approved',specificationApprovedAt:'2026-10-15',sizeGuide:{status:'approved',sections:[{title:'Top',kind:'top',rows:[{size:'S',chest:50,length:70},{size:'M',chest:52,length:72}]}]}})};
 const pack=buildTechPack(product),html=renderTechPackHTML(pack);
 assert.equal(pack.sections[0].rows.find(r=>r.size==='M').chest,52);
 assert.match(html,/OWNER-APPROVED SPECIFICATIONS/);
 assert.match(html,/Approved brand measurements/);
 assert.match(html,/owner approval does not invent test results/);
 assert.doesNotMatch(html,/SAMPLING DRAFT|unapproved draft proposal/);
 assert.match(html,/Retail price is the saved brand price/);
});
test('accessory sheets use saved dimensions and omit clothing size tables',()=>{
 const html=renderTechPackHTML(buildTechPack({id:'belt',name:'Belt',details_json:JSON.stringify({specificationStatus:'approved',sizeNotes:'Strap width 3.5 cm; usable length 75–115 cm',sizeGuide:{status:'approved',sections:[]}})}));
 assert.match(html,/Strap width 3.5 cm/);
 assert.match(html,/ACCESSORY DIMENSIONS/);
 assert.doesNotMatch(html,/REGIONAL SIZES &amp; HEIGHT/);
 assert.doesNotMatch(html,/<th class="sample">M<\/th>/);
});
