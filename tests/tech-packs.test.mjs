import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildTechPack,renderTechPackHTML,imageURL} from '../lib/tech-packs.mjs';
test('packs retain garment identity and saved measurements without inventing XS or regional equivalents',()=>{
 const pack=buildTechPack({id:'a',name:'A',details_json:JSON.stringify({sizeGuide:{status:'reference',sections:[{title:'Top',rows:[{size:'S',chest:51}]}]}})},[{product_id:'b',image_url:'/images/wrong.webp'}],[{product_id:'b',color:'wrong'}]);
 assert.deepEqual(pack.pictures,[]);assert.deepEqual(pack.colors,[]);
 const html=renderTechPackHTML(pack);assert.match(html,/China \(CN\/CH\)/);assert.match(html,/<th>XS<\/th><td>Pending/);assert.match(html,/<th>S<\/th><td>51/);assert.equal((html.match(/<article class="sheet">/g)||[]).length,2);
});
test('stored text is escaped and images cannot inject active URLs',()=>{
 const html=renderTechPackHTML(buildTechPack({id:'a',name:'<script>alert(1)</script>',details_json:'{"features":"<img onerror=evil>"}'}));
 assert(!html.includes('<script>alert'));assert(html.includes('&lt;img onerror=evil&gt;'));
 for(const url of ['javascript:alert(1)','//evil.test/a','https://evil.test/a'])assert.equal(imageURL(url),'');
});
test('invalid details remain an explicit sampling draft with missing views',()=>{
 const html=renderTechPackHTML(buildTechPack({id:'a',name:'A',details_json:'broken'}));
 assert.match(html,/SAMPLING DRAFT/);assert.match(html,/View pending/);assert.match(html,/Pending specification/);
});
test('unreviewed logo art is withheld and embedded manufacturer fields are extracted',()=>{
 const pack=buildTechPack({id:'a',name:'A',image_url:'/images/old-logo.webp',details_json:JSON.stringify({features:'Seven 17 mm snaps. Main seams 10 mm. Speed V emblem on chest.',fabric:'Woven label 60 x 20 mm. Rib cuffs 70 mm.'})});
 assert.equal(pack.pictures.length,0);
 assert.match(pack.details.hardware,/17 mm snaps/);assert.match(pack.details.stitching,/10 mm/);assert.match(pack.details.labels,/60 x 20/);
 assert(!pack.details.features.includes('Speed V'));
});

test('reviewed design-board detail regions remain matched to the exact garment',()=>{
 const url='https://api.vantanoir.store/api/media/products/7e8c6956-1300-5742-b3c4-402a539d5301.webp';
 const html=renderTechPackHTML(buildTechPack({id:'vn-street-block-party',name:'Varsity',image_url:url,image_alt:'Concept board',details_json:'{}'}));
 assert.match(html,/Chenille artwork construction reference/);assert.match(html,/enlarged design-board region/);assert.match(html,/href="https:\/\/api.vantanoir.store\/api\/media\/products\/7e8c6956/);
});

test('reviewed assets cannot leak across product identities',()=>{
 const image_url='https://api.vantanoir.store/api/media/products/7e8c6956-1300-5742-b3c4-402a539d5301.webp';
 assert.equal(buildTechPack({id:'different-product',image_url}).pictures.length,0);
});
test('Eclipse views preserve original lettering and use matching detail references',()=>{
 const id='vn-graphic-eclipse-runner-tee';
 const images=['Front','Back','Left','Right'].map((image_alt,i)=>({product_id:id,image_alt,image_url:`https://api.vantanoir.store/api/media/products/df016003-0006-4000-8000-00000000000${i+1}.webp`}));
 const pack=buildTechPack({id,name:'Eclipse Runner'},images);
 assert.equal(pack.pictures.length,4);
 const html=renderTechPackHTML(pack);
 assert.match(html,/Original VANTA NOIR lettering and hem/);
 assert.match(html,/Do not replace decorative lettering/);
 assert(!html.includes('View pending'));
});
test('shirt view crops exclude styling trousers from combined board',()=>{
 const pack=buildTechPack({id:'vn-aperture-afterimage',name:'Afterimage',image_url:'https://api.vantanoir.store/api/media/products/20261007-b006.webp'});
 assert.equal(pack.pictures.length,4);
 assert(pack.pictures.every(p=>p.crop[1]+p.crop[3]<=420));
 assert.match(renderTechPackHTML(pack),/Layered rear yoke/);
});
test('extra POMs in explicit single-component notes survive and grade separately',()=>{
 const details={audience:'men',garmentType:'tee',sizeGuide:{notes:'Additional flat cm (S/M/L/XL/XXL): Armhole depth: 25/26/27/28/29; Sleeve opening: 20/21/22/23/24',sections:[{rows:['S','M','L','XL','XXL'].map(size=>({size,chest:60}))}]}};
 const pack=buildTechPack({id:'a',details_json:JSON.stringify(details)});
 assert.equal(pack.sections[0].rows[0].armhole,24);
 assert.equal(pack.sections[0].rows[2].sleeveOpening,21);
 assert.match(renderTechPackHTML(pack),/Armhole depth/);
 details.sizeGuide.sections.push({rows:[{size:'S',waist:40}]});
 const multiple=buildTechPack({id:'a',details_json:JSON.stringify(details)});
 assert.equal(multiple.sections[0].rows[1].armhole,undefined);
});
