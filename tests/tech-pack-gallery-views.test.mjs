import test from 'node:test';
import assert from 'node:assert/strict';
import {imageRole} from '../lib/tech-pack-assets.mjs';

test('explicit gallery views override direction and detail words in garment names',()=>{
 for(const name of ['Fitted button-front denim overshirt','Snap-front Panel Coach Jacket','Longline Tee Side Slits And Sleeve Detail']){
  for(const role of ['Front','Back','Left','Right']){
   assert.equal(imageRole({image_alt:`${name} — Black, ${role.toLowerCase()} view`}),role);
  }
 }
 assert.equal(imageRole({image_alt:'Artwork detail'}),'Detail');
 assert.equal(imageRole({image_alt:'Four-view concept board'}),'board');
});
