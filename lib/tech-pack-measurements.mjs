export const EXTRA_POMS={
 collarHeight:['Stand collar height','Finished height at centre back from neck seam to upper edge.'],
 zipLength:['Centre-front zip length','Between top and bottom stops, fastened; excludes tape extensions.'],
 ankleZipLength:['Ankle zip length','Between top and bottom stops; fastened.'],
 cargoWidth:['Cargo pocket width','Maximum finished pocket width, bellows folded.'],
 cargoHeight:['Cargo pocket height','Opening seam to pocket base at centre.'],
 cargoOffset:['Cargo pocket position','Vertical from waistband lower seam to pocket opening at side seam.'],
 bicep:['Bicep, flat','Across sleeve 2.5 cm below underarm; perpendicular to sleeve grain.'],
 knee:['Knee, flat','Across leg at halfway point of inseam; perpendicular to grain.'],
 frontNeckDrop:['Front neck drop','Vertical from HSP level to centre-front neck seam; excludes collar.'],
 hoodHeight:['Hood height','Along centre-back from neckline seam to crown; hood laid flat.'],
 hoodDepth:['Hood depth','At widest level from centre-back seam to finished face edge.'],
 cuffHeight:['Cuff rib height','Finished depth along sleeve, excluding seam allowance.'],
 hemRibHeight:['Hem rib height','Finished vertical depth, excluding seam allowance.'],
 pocketWidth:['Front pocket width','Maximum finished width; exclude seam allowance.'],
 pocketHeight:['Front pocket height','Finished vertical height at centre.'],
 pocketHemOffset:['Pocket to rib offset','Vertical distance from pocket lower edge to top of hem rib.'],
 rearPocketWidth:['Rear pocket width','Finished width across top edge.'],
 rearPocketHeight:['Rear pocket height','Top edge to lowest point at pocket centre.'],
 rearPocketOffset:['Rear pocket position','Vertical from waistband lower seam to pocket top.'],
 pocketOpening:['Front pocket opening','Along finished pocket mouth between bartacks.'],
 pocketDepth:['Front pocket bag depth','Opening upper end to lowest bag point vertically.'],
 strapWidth:['Strap width','Finished width perpendicular to strap length.'],
 sideLength:['Side seam length','Along finished side seam between defined garment edges.'],
 centreFrontLength:['Centre-front length','From top finished centre-front edge to bottom centre-front edge.'],
 gussetWidth:['Gusset width','Across narrowest finished crotch gusset, relaxed.'],
 hpsToCrotch:['HPS to crotch closure','From high shoulder point to closed crotch fastening along front.'],
 underband:['Underband, relaxed','Half circumference of finished underband, relaxed.'],
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
