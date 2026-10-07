import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sizingFor,bodyBlock,fitProfile} from '../lib/manufacturer-sizing.mjs';
test('original body blocks and ease use circumference, then flat half width',()=>{const s=sizingFor({category:'T-shirts'},{audience:'women',fit:'regular'},[]);assert.equal(bodyBlock('women').rows[2].chest,92);assert.equal(s.charts[0].rows[2].chest,52);assert.equal(s.charts[0].rows[0].chest,46);assert.equal(s.proposed.length,6);});
test('saved dimensions are preserved; XS inherits only a consistent known grade',()=>{const s=sizingFor({category:'T-shirts'},{},[{title:'Top',rows:[{size:'S',chest:53},{size:'M',chest:56},{size:'L',chest:59}]}]);assert.equal(s.charts[0].rows[0].chest,50);assert.equal(s.charts[0].rows[1].chest,53);assert.equal(s.proposed.length,3);});
test('irregular grade, elastic tension, set components and specialist measurements are not invented',()=>{const s=sizingFor({category:'T-shirts'},{},[{rows:[{size:'S',chest:53},{size:'M',chest:57},{size:'L',chest:59}]}]);assert.equal(s.charts[0].rows[0].chest,undefined);for(const category of ['Bags','Bras and bralettes','Headwear','Hoodie and jogger sets'])assert.equal(fitProfile({category},{}).specialist,true);assert.equal(sizingFor({category:'Joggers'},{},[]).charts[0].rows[0].waist,undefined);});

test('specific garment type wins over broad category and partial word matches',()=>{
 assert.equal(fitProfile({category:'Jackets and coats'},{garmentType:'Varsity Jacket'}).chest,24);
 assert.equal(fitProfile({category:'Shirts and polos'},{garmentType:'Bowling Shirt'}).chest,14);
 assert.equal(fitProfile({category:'Trousers and utility pants'},{garmentType:'Baggy Cargo Pants'}).hip,14);
 assert.equal(fitProfile({category:'Cargo trousers'},{garmentType:'Offset Cargo Trousers'}).hip,14);
});
