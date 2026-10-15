import {test} from 'node:test';
import assert from 'node:assert/strict';
import targets from '../data/garment-measurements.json' with {type:'json'};
import {completeDesignTargets,regionalReferences} from '../lib/tech-pack-design-targets.mjs';
import {bodyBlock} from '../lib/manufacturer-sizing.mjs';
import {hasReviewedFlats,pomCode} from '../lib/tech-pack-flats.mjs';
test('complete matching saved blocks without replacing newer live chart values',()=>{
 const b=targets['vn-windbreaker'].blocks[0];
 const sections=[{kind:'top',title:'Shell',rows:['S','M','L','XL','XXL'].map((size,i)=>({size,chest:b.rows[0].values[i],length:b.rows[1].values[i]}))}];
 const out=completeDesignTargets({id:'vn-windbreaker'},{},sections);
 assert.equal(out.sections[0].rows[1].bicep,23);assert.equal(out.sections[0].rows[1].hoodHeight,37);
 assert.equal(sections[0].rows[1].bicep,undefined);
 sections[0].rows[1].chest=65;
 const conflict=completeDesignTargets({id:'vn-windbreaker'},{},sections);
 assert.equal(conflict.sections[0].rows[1].chest,65);assert.equal(conflict.sections[0].rows[1].bicep,undefined);assert.deepEqual(conflict.conflicts,['Shell']);
});
test('Stealth R03 targets do not regress to the older generic hoodie block',()=>{
 const sections=[{kind:'top',title:'Hoodie',rows:['S','M','L','XL','XXL'].map((size,i)=>({size,chest:58+i*2,length:70+i*2}))},{kind:'bottom',title:'Trousers',rows:['S','M','L','XL','XXL'].map((size,i)=>({size,waist:36+i*2,hip:58+i*2}))}];
 const result=completeDesignTargets({id:'vn-stealth'},{sizeGuide:{notes:'R03'}},sections);
 assert.equal(result.stealthR03,true);assert.equal(result.sections[0].rows[1].chest,60);assert.equal(result.sections[0].rows[1].hoodHeight,38);assert.equal(result.sections[1].rows[1].rearPocketWidth,15);assert.equal(result.sections[1].rows[1].legOpening,28);
});
test('numeric references use explicit body block and never invent audience',()=>{
 const male=regionalReferences({body:bodyBlock('men')},'men');assert.equal(male[1].uk,'40');assert.equal(male[1].cn,'178 / 100 / 84');
 const female=regionalReferences({body:bodyBlock('women')},'women');assert.equal(female[0].uk,'10');assert.equal(female[0].us,'6');assert.deepEqual(regionalReferences({body:bodyBlock('men')},undefined),[]);
});
test('reviewed drawings cannot leak to another product or a changed colourway',()=>{
 const product={id:'vn-stealth'},targetCompletion={stealthR03:true};
 const pictures=['c4b76bc2e83e55299d3c2bb33803addb','996a5f98b4d6b13048ddf256adff8e22'].map(h=>({image_url:'/api/media/products/'+h+'.webp'}));
 assert(hasReviewedFlats({product,pictures,targetCompletion}));assert(!hasReviewedFlats({product,pictures:pictures.slice(0,1),targetCompletion}));assert(!hasReviewedFlats({product:{id:'other'},pictures,targetCompletion}));assert.equal(pomCode('hip',true),'B03');assert.equal(pomCode('chest',false),'T01');
});
