import {missingManufacturing} from './manufacturing-specs.mjs';
import {selectProductAssets} from './tech-pack-assets.mjs';
export const LAUNCH_CHECKS = {
  design:'I checked every colourway, garment view and close-up; the unique artwork and current brand labels are correct.',
  construction:'I checked the style-specific stitch schedule, thread, seam/hem allowances, reinforcement, trims, hardware and label placements against the approved sample.',
  sizing:'I approved the graded measurements, fit ease, tolerances and wash/shrinkage results for the offered sizes.',
  price:'I approve the exact selling price shown here.',
  fulfilment:'The stock or preorder capacity and dispatch promise are accurate.'
};
export function isUnlaunched(p) { return p.status !== 'archived' && (p.status !== 'published' || p.details?.availability === 'preview' || p.details?.priceStatus !== 'approved'); }
export function launchIssues(p, mode) {
  const d=p.details||{}, issues=[];
  if(p.status==='archived') issues.push('Restore this archived product before reviewing it.');
  if(!Number.isSafeInteger(p.priceKobo)||p.priceKobo<100)issues.push('Save a valid selling price.');
  if(!p.images?.length)issues.push('Add this product’s own garment images.');
  const images=(p.images||[]).map(i=>({...i,image_url:i.imageUrl??i.image_url,image_alt:i.imageAlt??i.image_alt}));
  const activeVariants=(p.variants||[]).filter(v=>v.active!==false&&v.active!==0);
  const colors=new Set([...images.map(i=>i.color),...activeVariants.map(v=>v.color)].filter(Boolean));
  for(const color of colors){
    const assets=selectProductAssets({id:p.id,image_url:p.imageUrl??p.image_url},images,color);
    // A reviewed composite board is valid; otherwise require the actual directions
    // for this colour. Never let another colour's default gallery certify it.
    const board=assets.pictures.some(i=>i.role==='board'&&!i.reviewStatus);
    const missing=['Front','Back','Left','Right'].filter(role=>!assets.pictures.some(i=>i.role===role));
    if(assets.selectedColor!==color||(!board&&missing.length))issues.push(`Complete ${color} garment views: ${assets.selectedColor!==color?'Front, Back, Left, Right':missing.join(', ')}.`);
  }
  for(const key of ['fabric','features','care',...missingManufacturing(d)]) if(!d[key]?.trim())issues.push(`Complete ${key}.`);
  if(d.sizeGuide?.status!=='confirmed')issues.push('Confirm the style’s graded size guide after sample review.');
  for(const size of new Set(activeVariants.filter(v=>v.stock>0).map(v=>v.size))) if(!d.sizeGuide?.sections?.length||!d.sizeGuide.sections.every(s=>s.rows?.some(r=>r.size===size&&Object.entries(r).some(([key,value])=>key!=='size'&&typeof value==='number'&&value>0))))issues.push(`Save confirmed measurements for offered size ${size} in every included garment section.`);
  if(!activeVariants.some(v=>v.stock>0&&v.size!=='Size pending'))issues.push('Record actual sellable stock / controlled preorder capacity for at least one size.');
  if(!['in_stock','preorder'].includes(mode))issues.push('Choose ready stock or preorder.');
  if(mode==='preorder'&&!d.dispatchNote?.trim())issues.push('Save a confirmed preorder dispatch promise.');
  return issues;
}
