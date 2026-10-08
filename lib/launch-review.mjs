import {missingManufacturing} from './manufacturing-specs.mjs';
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
  for(const key of ['fabric','features','care',...missingManufacturing(d)]) if(!d[key]?.trim())issues.push(`Complete ${key}.`);
  if(d.sizeGuide?.status!=='confirmed')issues.push('Confirm the style’s graded size guide after sample review.');
  for(const size of new Set((p.variants||[]).filter(v=>v.active!==false&&v.stock>0).map(v=>v.size))) if(!d.sizeGuide?.sections?.some(s=>s.rows?.some(r=>r.size===size&&Object.entries(r).some(([key,value])=>key!=='size'&&typeof value==='number'&&value>0))))issues.push(`Save confirmed measurements for offered size ${size}.`);
  if(!p.variants?.some(v=>v.active!==false&&v.stock>0&&v.size!=='Size pending'))issues.push('Record actual sellable stock / controlled preorder capacity for at least one size.');
  if(!['in_stock','preorder'].includes(mode))issues.push('Choose ready stock or preorder.');
  if(mode==='preorder'&&!d.dispatchNote?.trim())issues.push('Save a confirmed preorder dispatch promise.');
  return issues;
}
