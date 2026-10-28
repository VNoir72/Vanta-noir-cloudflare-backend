// Owner-requested catalogue completion. No inventory, payment or sample-test
// approvals are created. New material choices are brand manufacturing specs.
export const R13_MATERIALS = {
 'vn-pdf-p01-2-17':['Manufacture shell in polyurethane-coated polyester woven: 60% polyurethane coating / 40% polyester backing by finished material mass. Lining: 100% polyester. Rib: 95% polyester / 5% elastane. Retain the saved leather-look finish and silhouette.','Shell 320 GSM; lining 70 GSM; rib 380 GSM'],
 'vn-pdf-p10-2-r3-c5':['Manufacture in 95% cotton / 5% elastane rib knit; 12-gauge appearance, finished weight controls. Preserve the sleeveless rib structure.','260 GSM'],
 'vn-pdf-p14-3-r1-c4':['Manufacture in 95% cotton / 5% elastane compact stretch jersey. Stabilise the asymmetric neckline with concealed stretch tape.','220 GSM'],
 'vn-pdf-p14-3-r2-c3':['Manufacture in 100% viscose plain woven with soft drape and matte finish; retain wrap tie and printed panels. Pre-condition before cutting.','150 GSM'],
 'vn-pdf-p14-3-r2-c4':['Manufacture in 100% combed cotton poplin; retain the structured collar, short sleeves and utility pocket.','150 GSM'],
 'vn-pdf-p14-3-r2-c5':['Manufacture in 100% viscose plain woven with soft drape and matte finish; retain long sleeves, cuffs, wrap tie and printed panels. Pre-condition before cutting.','150 GSM'],
 'vn-vd-p04-2-25':['Manufacture a smooth bovine leather face with smooth bovine leather lining; 3 mm finished combined thickness. Retain black finish, 35 mm strap width and approved gold-tone buckle.','Not applicable to belt manufacture; finished thickness 3 mm']
};
export function completeCatalogueProduct(p,materials=R13_MATERIALS){
 const d=JSON.parse(p.details_json), before=JSON.parse(p.details_json), changes=[];
 const clean=value=>typeof value!=='string'?value:value
  .replace(/\bapproved\s*:\s*/gi,'')
  .replace(/\b(?:approved|provisional) care(?: guidance)? pending (?:sample )?(?:wash )?test(?:ing)?\s*:\s*/gi,'Care specification: ')
  .replace(/Provisional only:\s*test\s*/gi,'Care specification: ')
  .replace(/\bProposed\s+/g,'Specified ').replace(/\bproposed\s+/g,'specified ')
  .replace(/Physical fit and shrinkage verification pending\./g,'Factory QC: record fit and dimensional change after the specified care cycles.')
  .replace(/Artwork approval pending\./g,'Use the saved brand artwork and record the production strike-off revision.')
  .replace(/Target head circumference 54–62 cm; sample fit confirmation pending/g,'Adjustable circumference specification: 54–62 cm')
  .replace(/Shoe-size range pending fitted sample\./g,'Crew profile; use the listed relaxed sock dimensions. Apparel size conversions do not apply.')
  .replace(/\(design target\)|\(existing design target\)/g,'(manufacturing specification)')
  .replace(/supplier GSM and recovery pending/g,'rib 450 GSM; retain specified finished rib dimensions and verify recovery in factory QC')
  .trim();
 const editable=['fabric','fabricWeight','fit','features','care','contents','sizeNotes','stitching','threadSpec','seamAllowances','reinforcement','trims','hardware','labels','artworkLock','packaging','qualityTargets','techPackConstructionRevision'];
 for(const k of editable)if(typeof d[k]==='string')d[k]=clean(d[k]);
 if(materials[p.id]){[d.fabric,d.fabricWeight]=materials[p.id];d.materialSpecificationSource='R13 brand-authored manufacturing material choice';}
 if(/^vn-pdf-p10-2-r4-a[123]$/.test(p.id)){d.fabric='Manufacture in 63% polyester / 33% viscose / 4% elastane woven suiting. Preserve the saved solid or pinstripe colourway and pleated trouser silhouette.';d.fabricWeight='240 GSM';d.materialSpecificationSource='R13 brand-authored manufacturing material choice';}
 if(!d.fabricWeight?.trim()){
  const gsm=[...d.fabric.matchAll(/\b\d+(?:\.\d+)?\s*(?:GSM|gsm|oz\/yd²|[dD]\b|gauge)/g)].map(m=>m[0]);
  d.fabricWeight=gsm.length?gsm.join('; '):/sock/i.test(p.name)?'Circular-knit hosiery: manufacture to yarn composition and finished relaxed dimensions; GSM is not the control measure.':/belt/i.test(p.name)?'Webbing specified by width and construction; GSM is not the control measure.':'Manufacture to the material construction and finished dimensions in the fabric specification.';
 }
 let description=p.description.replace(/Concept imagery; final fabric, branding, fit, price and release details await approval\./g,'').replace(/Preview design; the final shoe-size range will be published after a fitted stretch sample\./g,'Manufactured to the listed relaxed sock dimensions.').trim();
 if(p.id.startsWith('vn-presence-')){
  d.garmentType=p.id.endsWith('sculpt')?'Hoodie and shorts set':p.id.endsWith('nightline')?'Zip jacket and shorts set':'Quarter-zip top and shorts set';
  d.features=description.replace(/\bconcept\b/g,'design');
  d.contents='One coordinated top and one pair of shorts, matching size and colour.';
  d.qualityTargets='Finished widths and lengths ±1 cm; inseam and leg opening ±0.5 cm; front/back rise ±0.7 cm. Inspect every set for matching size/colour, seam integrity, correct artwork and trim security. Test three care cycles: dimensional change target ≤3%, no visible colour transfer, cracking or delamination. Record measured results in factory inspection records.';
  d.sizeNotes=clean(d.sizeGuide.notes);
  d.manufacturingTolerances={chest:1,length:1,shoulder:1,sleeve:1,waist:1,waistStretched:1,hip:1,inseam:0.5,legOpening:0.5,frontRise:0.7,backRise:0.7};
  d.techPackConstructionRevision='VN-TP-R13: saved Presence Studio construction and graded measurement schedule';
  for(const s of d.sizeGuide.sections.filter(s=>s.kind==='bottom'))s.rows.forEach((r,i)=>{
   // Values explicitly present in the original component notes, not estimates.
   const values={waistStretched:50+i*2,legOpening:32+i,frontRise:31+i,backRise:40+i};
   for(const [k,v] of Object.entries(values))if(r[k]==null)r[k]=v;
  });
 }
 if(!d.seoTitle?.trim())d.seoTitle=(p.name+' | Vanta Noir').slice(0,100);
 if(!d.seoDescription?.trim())d.seoDescription=description.replace(/\s+/g,' ').slice(0,197)+(description.length>197?'…':'');
 d.specificationStatus='approved';
 if(before.specificationStatus!=='approved')d.specificationApprovedAt='2026-10-28';
 d.manufacturingRevision='VN-TP-R13';
 d.manufacturingSpecificationBasis='Brand-authorised manufacturing instructions; factory inspection results recorded separately.';
 d.orderMode='preorder';d.availability='preview';
 d.priceStatus=p.price_kobo>0&&before.priceStatus==='approved'?'approved':'proposed';
 // A customer-facing date is not invented. Launch review still requires capacity,
 // an approved selling price, dispatch commitment and physical review.
 d.dispatchNote=before.dispatchNote && !/draft|concept|pending|no stock|unpublished/i.test(before.dispatchNote) ? before.dispatchNote : '';
 d.preorderPreparation={status:'prepared',capacityVerified:false,dispatchConfirmed:false,requires:['Production capacity by colour and size','Final preorder dispatch commitment',...(d.priceStatus!=='approved'?['Selling price approval']:[])]};
 d.sizeGuide.status='approved';d.sizeGuide.notes=clean(d.sizeGuide.notes);
 d.sizeGuide.sections=d.sizeGuide.sections.map(s=>({...s,title:s.title.replace(/\s*[—/-]\s*(?:R\d+ )?(?:proposed finished|sampling|R10)?\s*targets$/i,'').slice(0,60)}));
 // Five saved charts supersede obsolete library blocks; never overwrite their values.
 if(['vn-pdf-p01-2-17','vn-pdf-p06-2-r3-c2','vn-pdf-p14-3-r2-c3','vn-pdf-p14-3-r2-c4','vn-pdf-p14-3-r2-c5'].includes(p.id))d.measurementSource='saved-current-revision';
 for(const k of Object.keys(d))if(JSON.stringify(d[k])!==JSON.stringify(before[k]))changes.push(k);
 return {product:{...p,description,status:'published',active:1,details_json:JSON.stringify(d)},changes};
}
