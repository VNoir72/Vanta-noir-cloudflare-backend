export const EXTRA_POMS={
 armhole:['Armhole depth','HSP vertically to underarm level; do not measure curved seam.'],
 sleeveOpening:['Sleeve opening, flat','Straight across finished sleeve opening, relaxed.'],
 hem:['Hem width, flat','Straight across finished hem, garment fastened.'],
 neckWidth:['Neck width','Inside neck edge to inside neck edge at shoulder level.'],
 collarPoint:['Collar point length','Collar seam to point along centre of point.'],
 frontRise:['Front rise','Crotch junction along front rise seam to top of waistband.'],
 backRise:['Back rise','Crotch junction along back rise seam to top of waistband.'],
 thigh:['Thigh, flat','Across leg 2.5 cm below crotch junction.'],
 legOpening:['Leg opening, flat','Across finished leg opening, relaxed.'],
 waistHeight:['Waistband height','Finished height at centre front, excluding seam reserve.'],
 footLength:['Foot length','Heel to toe along sole of relaxed sock.'],
 legHeight:['Sock leg height','Heel reference to cuff top, relaxed.'],
 width:['Width','Use style drawing to establish measurement endpoints.'],
 depth:['Depth','Use style drawing to establish measurement endpoints.'],
 strapLength:['Strap length','Between attachment points at specified adjustment.']
};
const aliases={armhole:'armhole',armholedepth:'armhole',sleeveopening:'sleeveOpening',sleeveopeningwidth:'sleeveOpening',hem:'hem',hemwidth:'hem',neckwidth:'neckWidth',collarpointlength:'collarPoint',frontrise:'frontRise',backrise:'backRise',thigh:'thigh',thighwidth:'thigh',legopening:'legOpening',legopeningwidth:'legOpening',waistbandheight:'waistHeight',footlength:'footLength',legheight:'legHeight'};
// Parse only explicitly labelled S/M/L/XL/XXL notes for a single component.
// Ambiguous multi-piece notes stay verbatim and must not be assigned to both pieces.
export function supplementMeasurements(sections,notes){
 if(sections.length!==1||typeof notes!=='string'||! /S\s*\/\s*M\s*\/\s*L\s*\/\s*XL\s*\/\s*XXL/i.test(notes))return sections;
 const rows=sections[0].rows.map(r=>({...r}));
 const pattern=/([A-Za-z ]+?)\s*:?\s*(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?){4})(?!\s*\/\s*\d)/g;
 for(const match of notes.matchAll(pattern)){
  const key=aliases[match[1].trim().toLowerCase().replace(/\s/g,'')];if(!key)continue;
  const values=match[2].split('/').map(Number);
  ['S','M','L','XL','XXL'].forEach((size,i)=>{const row=rows.find(r=>r.size===size);if(row&&row[key]===undefined)row[key]=values[i];});
 }
 return [{...sections[0],rows}];
}
