import {EXTRA_POMS} from './tech-pack-measurements.mjs';
export const STANDARD_REVISION='VN-SIZE-R1';
export const SIZES=['XS','S','M','L','XL','XXL'];
export const METHODS={chest:'Flat, 2.5 cm below underarm; garment fastened and relaxed.',waist:'Relaxed waistband; curved bands measured along seam, then halved.',waistStretched:'Functional stretched opening at the agreed test load; never infer from relaxed waist.',hip:'Flat at full hip; record depth below waistband.',shoulder:'Across shoulder seam points; dropped shoulders require their own reach check.',sleeve:'Shoulder seam to finished cuff; raglan measured separately.',length:'High shoulder point to hem for tops; waistband top to hem for bottoms.',inseam:'Crotch seam junction to finished hem along inside seam.'};
Object.assign(METHODS,Object.fromEntries(Object.entries(EXTRA_POMS).map(([key,value])=>[key,value[1]])));
export function bodyBlock(audience){const women=audience==='women';return {name:women?'Women regular':'Men / unisex regular',height:women?168:178,rows:SIZES.map((size,i)=>({size,chest:(women?80:88)+i*6,waist:(women?62:72)+i*6,hip:(women?88:90)+i*6}))};}
export function fitProfile(product,d){
 const s=`${d.garmentType||product.category||product.name||''} ${d.fit||''}`.toLowerCase();
 if(/\b(?:bags?|backpack|crossbody|headwear|caps?|hats?|beanie|belts?|sunglasses|socks?|gloves?|scarf|bras?|bralettes?|corset|bustier|bodysuit|compression|leggings?|underwear|briefs?)\b/.test(s))return {name:'Specialist block required',specialist:true};
 if(/\bsets?\b|\+/.test(s))return {name:'Separate component blocks',specialist:true};
 const oversize=/oversiz|baggy|wide.leg/.test(s),relaxed=/relaxed|boxy/.test(s),close=/fitted|slim|baby/.test(s);
 if(/\b(?:trousers?|pants?|jeans?|joggers?|shorts|skirts?|skorts?|short(?![-\s]+sleeve))\b/.test(s))return {name:oversize||/cargo/.test(s)?'Relaxed bottom':'Regular bottom',bottom:true,waist:oversize||/cargo/.test(s)?4:3,hip:oversize||/cargo/.test(s)?14:8,elastic:/jogger|sweat|track|mesh|elastic/.test(s)};
 if(/puffer|coat|parka/.test(s))return {name:'Layered outerwear',chest:30,waist:28,hip:28};
 if(/jacket|windbreaker|shell|bomber|varsity|overshirt/.test(s))return {name:'Light outerwear',chest:24,waist:22,hip:22};
 if(/hood|sweatshirt|fleece/.test(s))return {name:oversize?'Oversized fleece':'Regular fleece',chest:oversize?28:20,waist:oversize?26:18,hip:oversize?26:18};
 if(/shirt/.test(s)&&! /t.shirt|tee|polo|sweat|jersey|knit/.test(s))return {name:relaxed?'Relaxed woven shirt':'Regular woven shirt',chest:relaxed?20:14,waist:relaxed?18:12,hip:relaxed?18:12};
 if(/shirt|tee|polo|tank|singlet|jersey|top|dress|sweater|knit/.test(s))return {name:close?'Close non-compression top':oversize?'Oversized top':relaxed?'Relaxed top':'Regular top',chest:close?6:oversize?28:relaxed?20:12,waist:close?6:oversize?26:relaxed?18:10,hip:close?6:oversize?26:relaxed?18:10};
 return {name:'Style block required',specialist:true};
}
const finite=v=>v!==null&&v!==''&&v!==undefined&&Number.isFinite(Number(v));
export function sizingFor(product,d,sections){
 const body=bodyBlock(d.audience),profile=fitProfile(product,d);
 if(!['women','men','unisex'].includes(d.audience)) {profile.specialist=true;profile.name='Confirm audience / body block';body.name='Unassigned - reference block only';}
 const source=sections.length?sections:[{title:'Garment',rows:Array.isArray(d.sizeChart)?d.sizeChart:[]}];
 const proposed=[];
 const charts=source.map(section=>{
  const known=(section.rows||[]).filter(r=>SIZES.includes(r?.size));
  const keys=new Set(known.flatMap(r=>Object.keys(r).filter(k=>k!=='size'&&Object.hasOwn(METHODS,k))));
  if(!keys.size&&!profile.specialist){if(profile.bottom){keys.add('hip');if(!profile.elastic)keys.add('waist');}else keys.add('chest');}
  const rows=SIZES.map((size,i)=>{const saved=known.find(r=>r.size===size)||{};const row={...saved,size};
   for(const key of keys){if(finite(row[key]))continue;
    const points=known.filter(r=>finite(r[key])).map(r=>({i:SIZES.indexOf(r.size),v:Number(r[key])})).sort((a,b)=>a.i-b.i);
    // Extrapolate only a consistent numeric grade from two or more adjacent known sizes.
    let value;
    if(points.length>=2){const steps=points.slice(1).map((p,n)=>(p.v-points[n].v)/(p.i-points[n].i));if(steps.every(g=>Math.abs(g-steps[0])<0.01))value=points[0].v+(i-points[0].i)*steps[0];}
    if(value===undefined&&!points.length&&!profile.specialist&&['chest','waist','hip'].includes(key)&&!(key==='waist'&&profile.elastic)&&finite(profile[key]))value=(body.rows[i][key]+profile[key])/2;
    if(value>0){row[key]=Math.round(value*10)/10;proposed.push({section:section.title||'Garment',size,key,value:row[key]});}
   }return row;});
  return {...section,rows};
 });
 const impliedEase=charts.map(section=>{const m=section.rows.find(r=>r.size==='M')||{};return {title:section.title||'Garment',values:['chest','waist','hip'].filter(k=>finite(m[k])).map(k=>`${k}: ${Math.round((Number(m[k])*2-body.rows[2][k])*10)/10} cm`)};});
 const methods=[...new Set(charts.flatMap(s=>s.rows.flatMap(r=>Object.keys(r))))].filter(k=>METHODS[k]).map(k=>`${k}: ${METHODS[k]}`).join(' ');
 return {revision:STANDARD_REVISION,body,profile,charts,proposed,impliedEase,methods,notes:'Body + total fit ease = finished circumference. Half-width grade is half the circumference grade. Height controls length/proportions; kilograms alone do not determine size. Proposed values require sample fitting; existing values are retained.'};
}
export function standardNotes(s){return `${s.revision}: ${s.body.name}; reference height ${s.body.height} cm. ${s.notes}\nDevelopment guideline only (saved garment chart takes precedence): ${s.profile.name}. ${s.profile.specialist?'Use component / specialist pattern and actual material stretch tests.':`Total circumference ease: chest ${s.profile.chest??'N/A'}, waist ${s.profile.waist??'N/A'}, hip ${s.profile.hip??'N/A'} cm. Do not add ease twice.`}\nM chart-derived full-circumference difference from reference body (relaxed elastic waist is not wearing ease): ${s.impliedEase.map(v=>`${v.title}: ${v.values.join('; ')||'no applicable dimensions'}`).join(' / ')}.\nMethods: ${s.methods}\nFinished POMs after factory finishing and 24h relaxed. Use saved style tolerance first; otherwise proposed defaults: flat width woven ±0.5 cm / knit ±1 cm; length/inseam ±1 cm; shoulder/sleeve ±0.5 cm.\nUse the exact saved seam/hem allowance for this style. Where absent, proposed starting reserves only: knit join 6 mm; woven join 10 mm; knit hem 20 mm; trouser hem 30 mm. Reserve is added at pattern cutting, not to finished measurements. Confirm each seam operation before cutting.\nShrinkage: pre-process dimension = finished target / (1 - measured shrinkage). Test actual fabric/finish; record length and width separately. No automatic weight-to-size or universal numeric UK/US/China conversion.`;}
