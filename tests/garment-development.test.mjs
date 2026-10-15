import test from 'node:test';import assert from 'node:assert/strict';
import {developmentConstruction,garmentFamily} from '../lib/garment-development.mjs';
test('specialist construction is appropriate and existing instructions win',()=>{
 assert.equal(garmentFamily({name:'Arc Baggy Jeans',category:'Jeans'}),'denim');
 assert.equal(garmentFamily({name:'Angular Sunglasses'}),'eyewear');
 assert.match(developmentConstruction({name:'Core Sports Bottle'}).stitching,/not sewn/);
 const sock=developmentConstruction({id:'sock',name:'Crew socks'});assert.match(sock.stitching,/link toe/i);assert.doesNotMatch(sock.stitching,/sleeve/);
 const knit=developmentConstruction({name:'Cable quarter-zip',category:'Knitwear'});assert.match(knit.stitching,/fully fashioned/i);
 const brief=developmentConstruction({name:'Boxer Briefs'});assert.match(brief.stitching,/514/);
 const saved={stitching:'301 exact saved schedule',threadSpec:'Tex 45',seamAllowances:'12 mm',labels:'Exact master 45 mm'};const changes=developmentConstruction({name:'Denim jacket'},saved);for(const key of Object.keys(saved))assert.equal(changes[key],undefined);
 const extracted=developmentConstruction({name:'Cotton tee'},{features:'Use 10 mm seam allowance. Preserve chest print.'});assert.match(extracted.seamAllowances,/10 mm/);assert.doesNotMatch(extracted.seamAllowances,/6 mm/);
 assert.equal(garmentFamily({name:'Transit Crossbody Bag'}),'bag');assert.equal(garmentFamily({name:'Rib Knit Beanie'}),'knit');
});
