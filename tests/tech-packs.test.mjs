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
 const html=renderTechPackHTML(buildTechPack({id:'varsity',name:'Varsity',image_url:url,image_alt:'Concept board',details_json:'{}'}));
 assert.match(html,/Chenille artwork construction reference/);assert.match(html,/enlarged design-board region/);assert.match(html,/href="https:\/\/api.vantanoir.store\/api\/media\/products\/7e8c6956/);
});
