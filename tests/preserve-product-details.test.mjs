import test from 'node:test';
import assert from 'node:assert/strict';
import {preserveProductDetails} from '../lib/preserve-product-details.mjs';
test('admin save retains attachment provenance and extended manufacturing measurements',()=>{
 const saved={manufacturingAttachments:[{key:'private/garment.pdf'}],visualReview:{revision:'R10'},sizeGuide:{status:'approved',sections:[{kind:'top',title:'Jacket',rows:[{size:'M',chest:60,hoodHeight:38},{size:'L',chest:62,hoodHeight:39}]}]}};
 const editable={fabric:'New specification',sizeGuide:{status:'approved',sections:[{kind:'top',title:'Jacket',rows:[{size:'M',chest:61}]}]}};
 const result=preserveProductDetails(JSON.stringify(saved),editable);
 assert.deepEqual(result.manufacturingAttachments,saved.manufacturingAttachments);
 assert.deepEqual(result.visualReview,saved.visualReview);
 assert.deepEqual(result.sizeGuide.sections[0].rows,[{size:'M',chest:61,hoodHeight:38}]);
 assert.equal(result.fabric,'New specification');
 assert.equal(saved.sizeGuide.sections[0].rows[0].chest,60);
});
test('explicit removal and replaced components do not resurrect old charts',()=>{
 const raw={sizeGuide:{sections:[{kind:'bottom',title:'Shorts',rows:[{size:'M',waist:38,cargoWidth:20}]}]}};
 assert.equal(preserveProductDetails(raw,{sizeGuide:null}).sizeGuide,null);
 const result=preserveProductDetails(raw,{sizeGuide:{sections:[{kind:'top',title:'Shirt',rows:[{size:'M',chest:55}]}]}});
 assert.deepEqual(result.sizeGuide.sections[0].rows,[{size:'M',chest:55}]);
 assert.deepEqual(preserveProductDetails('bad JSON',{fabric:'Cotton'}),{fabric:'Cotton'});
});
