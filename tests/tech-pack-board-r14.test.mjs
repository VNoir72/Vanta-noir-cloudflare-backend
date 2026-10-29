import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD_SIZE,renderBoardTechPack,boardReadiness} from '../lib/tech-pack-board-template.mjs';

const pack={product:{id:'unique-tee',name:'Unique <tee>',category:'T-shirts'},details:{fabric:'Cotton',features:'Keep this exact print.'},ownerApproved:true,pictures:['Front','Back','Left','Right'].map(role=>({role,image_url:'https://api.vantanoir.store/api/media/products/'+role.toLowerCase()+'.webp'})),sections:[{title:'Tee',kind:'top',rows:['S','M','L','XL','XXL'].map((size,i)=>({size,chest:50+i*2,length:68+i*2}))}],sizes:['S','M','L','XL','XXL'],colors:['Black'],imageColors:['Black'],selectedColor:'Black',variants:[{color:'Black',size:'M',sku:'TEE-B-M'}],measurementStatus:'Approved brand measurements'};
test('reference board exports the requested dimensions without fitting to A4',()=>{
 const html=renderBoardTechPack(pack);
 assert.deepEqual(BOARD_SIZE,{width:1536,height:864,pdfWidth:1152,pdfHeight:648});
 assert.match(html,/@page\{size:1536px 864px;margin:0\}/);
 assert.doesNotMatch(html,/size:A4/);
 assert.match(html,/Unique &lt;tee&gt;/);
 assert.match(html,/TEE-B-M/);
 for(const value of [50,52,54,56,58,68,70,72,74,76])assert.ok(html.includes('>'+value+'</td>'));
});
test('unreviewed garment never inherits another garment technical flat',()=>{
 assert.ok(boardReadiness(pack).some(s=>s.includes('technical sketch')));
 const html=renderBoardTechPack(pack);
 assert.doesNotMatch(html,/class="technical-flat"/);
 assert.match(html,/Technical drawing is not yet verified/);
});
test('missing views and sizes remain explicit completion issues',()=>{
 const broken={...pack,pictures:pack.pictures.slice(0,3),sections:[{...pack.sections[0],rows:pack.sections[0].rows.slice(0,4)}]};
 const issues=boardReadiness(broken);
 assert.ok(issues.includes('Right garment view is missing.'));
 assert.ok(issues.includes('Tee: chest, XXL has no dimension.'));
});
