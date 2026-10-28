import savedTargets from '../data/garment-measurements.json' with {type:'json'};
export const TARGET_REVISION='VN-DESIGN-R04';
export const TARGET_SIZES=['S','M','L','XL','XXL'];
const keys={T1:'chest',T2:'length',T3:'shoulder',T4:'sleeve',T5:'hem',T6:'bicep',T7:'armhole',T8:'sleeveOpening',T9:'neckWidth',T10:'frontNeckDrop',T11:'strapWidth',B1:'waist',B2:'waistStretched',B3:'hip',B4:'frontRise',B5:'backRise',B6:'thigh',B7:'knee',B8:'legOpening',B9:'inseam'};
const named={'Half waist':'waist','Half hip':'hip','Half hem sweep':'hem','Skirt length':'length','Side seam length':'sideLength','Centre-front length':'centreFrontLength','Gusset width':'gussetWidth','HPS to crotch closure':'hpsToCrotch','Underband width relaxed':'underband'};
const grade=(m,g)=>TARGET_SIZES.map((_,i)=>Math.round((m+(i-1)*g)*10)/10);
// R03 saved source is authoritative. Additional grades below are authored design targets,
// not measurements taken from photographs or approved physical samples.
const stealth={
 top:{chest:[58,60,62,64,66],length:[70,72,74,76,78],shoulder:[56,58,60,62,64],sleeve:[61,62,63,64,65],hem:[48,50,52,54,56],sleeveOpening:[10,10.5,11,11.5,12],bicep:grade(25,1),armhole:grade(28,1),hoodHeight:grade(38,0.5),hoodDepth:grade(30,0.5),cuffHeight:grade(7,0),hemRibHeight:grade(7,0),pocketWidth:grade(36,1),pocketHeight:grade(21,0.5),pocketHemOffset:grade(3,0),neckWidth:grade(22,0.5),frontNeckDrop:grade(10,0.5)},
 bottom:{waist:[36,38,40,42,44],hip:[58,60,62,64,66],length:[102,104,106,108,110],inseam:[73,74,75,76,77],thigh:[33,34,35,36,37],legOpening:[27,28,29,30,31],frontRise:grade(33,0.5),backRise:grade(43,0.5),waistHeight:grade(5,0),rearPocketWidth:grade(15,0),rearPocketHeight:grade(17,0),rearPocketOffset:grade(6,0),pocketOpening:grade(17,0.5),pocketDepth:grade(28,0.5),knee:grade(30,1)}
};
const coreExtras={
 'vn-windbreaker':{top:{hoodHeight:grade(37,0.5),hoodDepth:grade(30,0.5),zipLength:grade(69,2),pocketOpening:grade(18,0.5),pocketDepth:grade(28,0.5),cuffHeight:grade(3,0),hemRibHeight:grade(3,0)},bottom:{length:grade(105,2),waistHeight:grade(4.5,0),pocketOpening:grade(18,0.5),pocketDepth:grade(28,0.5),cargoWidth:grade(18,0.5),cargoHeight:grade(22,0.5),cargoOffset:grade(25,0.5)}},
 'vn-stand-collar-performance':{top:{collarHeight:grade(6,0),zipLength:grade(66,2),pocketOpening:grade(17,0.5),pocketDepth:grade(26,0.5),cuffHeight:grade(5,0),hemRibHeight:grade(5,0)},bottom:{length:grade(103,2),waistHeight:grade(4.5,0),cuffHeight:grade(5,0),pocketOpening:grade(17,0.5),pocketDepth:grade(26,0.5)}},
 'vn-hooded-performance':{top:{hoodHeight:grade(37,0.5),hoodDepth:grade(29,0.5),zipLength:grade(66,2),pocketOpening:grade(17,0.5),pocketDepth:grade(26,0.5),cuffHeight:grade(3,0),hemRibHeight:grade(5,0)},bottom:{length:grade(103,2),waistHeight:grade(4.5,0),ankleZipLength:grade(20,0),pocketOpening:grade(17,0.5),pocketDepth:grade(26,0.5)}}
};
const numeric=v=>typeof v==='number'&&Number.isFinite(v);
function rowsFor(fields){return TARGET_SIZES.map((size,i)=>Object.fromEntries([['size',size],...Object.entries(fields).map(([k,v])=>[k,v[i]])]));}
function fits(source,target){
 const matches=source.flatMap(r=>{const t=target.find(v=>v.size===r.size);return t?Object.entries(r).filter(([k,v])=>k!=='size'&&numeric(v)&&numeric(t[k])).map(([k,v])=>Math.abs(v-t[k])<0.01):[];});
 return matches.length>=4&&matches.every(Boolean);
}
export function completeDesignTargets(product,details,sections){
 if(details.measurementSource==='saved-current-revision')return {sections,filled:[],sources:['Current saved manufacturing revision; supersedes older library block'],conflicts:[],stealthR03:false};
 const sources=[],conflicts=[],filled=[];
 const r03=product.id==='vn-stealth'&&/R03/.test(JSON.stringify(details.sizeGuide||{}));
 const target=savedTargets[product.id];
 const blocks=r03?Object.entries(stealth).map(([kind,fields])=>({kind,rows:rowsFor(fields),revision:'Stealth R03 source + R04 supplemental grades'})):(target?.blocks||[]).map(b=>({kind:b.kind,revision:target.revision,rows:rowsFor(Object.fromEntries(b.rows.map(r=>[keys[r.label.split(' ')[0]]||named[r.label],r.values]).filter(([k])=>k)))}));
 const result=sections.map((section,index)=>{
  const kind=section.kind||(/trouser|pants|short|jogger|bottom|skirt/i.test(section.title||'')?'bottom':'top');
  const sameKind=blocks.filter(b=>b.kind===kind);
  const block=blocks.length===sections.length&&blocks[index]?.kind===kind?blocks[index]:sameKind.length===1?sameKind[0]:null;
  if(!block)return section;
  if(!fits(section.rows,block.rows)){conflicts.push(section.title||kind);return section;}
  sources.push(block.revision);if(coreExtras[product.id])sources.push(TARGET_REVISION+' supplemental construction targets');
  return {...section,rows:section.rows.map(row=>{
   const t=block.rows.find(v=>v.size===row.size);if(!t)return {...row};const out={...row};
   const extra=coreExtras[product.id]?.[kind];
   const merged={...(extra?rowsFor(extra).find(v=>v.size===row.size):{}),...t};
   for(const [key,value] of Object.entries(merged))if(key!=='size'&&(out[key]===undefined||out[key]===null||out[key]==='')){out[key]=value;filled.push({section:section.title||'Garment',size:row.size,key,value});}
   return out;
  })};
 });
 return {sections:result,filled,sources:[...new Set(sources)],conflicts,stealthR03:r03&&sources.length===2};
}
export function regionalReferences(sizing,audience){
 if(!['men','women','unisex'].includes(audience))return [];
 const women=audience==='women';
 return TARGET_SIZES.map((size,i)=>{
  const b=sizing.body.rows.find(r=>r.size===size);if(!b)return [];
  return {size,uk:women?String(10+i*2):String(Math.round(b.chest/2.54/2)*2),us:women?String(6+i*2):String(Math.round(b.chest/2.54/2)*2),waistIn:Math.round(b.waist/2.54),cn:`${sizing.body.height} / ${b.chest} / ${b.waist}`,body:`${b.chest} / ${b.waist} / ${b.hip}`};
 });
}
