import {coreDesignDetails} from './tech-pack-core-specs.mjs';
import {completeDesignTargets,regionalReferences} from './tech-pack-design-targets.mjs';
import {renderVideoTechPack,EXPORT_SIZES} from './tech-pack-template.mjs';
import {constructionProposal} from './manufacturing-specs.mjs';
import {EXTRA_POMS,supplementMeasurements} from './tech-pack-measurements.mjs';
import {selectProductAssets,sourceDetails,artworkRule} from './tech-pack-assets.mjs';
import {sizingFor,standardNotes} from './manufacturer-sizing.mjs';
export const PACK_SIZES = EXPORT_SIZES;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pending = 'Pending specification';
// Reviewed detail regions on the existing 1536x1024 design boards. No generated replacement photography.
const detailRegions = {
 '239ede98-4269-576e-9893-f2e977430b50':[950,'Waist label / seam reference','Pocket reinforcement reference'],
 '7e8c6956-1300-5742-b3c4-402a539d5301':[935,'Chenille artwork construction reference','Sleeve embroidery / rib reference'],
 'f3476178-7bb2-554b-9f6e-6182d4c24de7':[1030,'Perforated insert / piping reference','Zip hardware / collar reference'],
 'eaf2a2f4-45e8-5a00-9a0e-1f50f28644f1':[1005,'Collar / zip / chest embroidery reference','Back embroidery reference'],
 '3993f4ca-ad34-5e48-bb9e-fd37fef520bf':[1010,'Cargo flap / pull-tab reference','Rear pocket / topstitch reference'],
 '8b3063dd-a49b-5e6b-a49f-5b6808c20840':[1045,'Cord collar / zip reference','Panel artwork / zip reference'],
 'c4ff6934-af4e-513d-a203-ef30bdd41d2d':[940,'Jacquard texture reference','Rib cuff / emblem reference'],
 'd3f161e2-f9f4-50c5-a2f2-aab2a7a071f0':[1115,'Collar / neck label / button reference','Pocket / print alignment reference'],
 '292f0532-43b4-5a3e-b240-220be36dd17e':[945,'Waistband / embroidery reference','Rear pocket / seam reference'],
 '74809d29-f25a-5808-8948-807d2645a3e7':[980,'Neck / chest artwork reference','Print texture / hem reference'],
 'bb9aa531-d026-5b0a-8305-8d9a845c8f1d':[970,'Mesh / appliqué artwork reference','Hem vent / panel seam reference']
};
function boardDetails(board){
 const key=board?.image_url?.match(/products\/([a-f0-9-]+)\.webp$/)?.[1],region=detailRegions[key];
 if(!region)return '';
 const [x,...labels]=region;
 return labels.map((label,i)=>`<figure><svg role="img" aria-label="${esc(label)}" viewBox="${x} ${i*512} ${1536-x} 512" style="width:100%;height:48mm"><image href="${esc(board.image_url)}" width="1536" height="1024"/></svg><figcaption>${esc(label)} · enlarged design-board region; sample verification required</figcaption></figure>`).join('');
}
function currentBrandText(value) {
  return text(value).split(/\n|(?<=[.!;])\s+/).filter(line=>!(/speed.?v|speed emblem|2024|2025|old.generation|legacy logo/i.test(line))).join('\n');
}
function specPart(details, key, pattern) {
  if (text(details[key])) return currentBrandText(details[key]);
  return [details.fabric,details.features].flatMap(v=>text(v).split(/\n|(?<=[.!;])\s+/)).filter(line=>pattern.test(line)).map(currentBrandText).filter(Boolean).join('\n');
}
export function imageURL(value) {
  if (typeof value !== 'string') return '';
  if (/^\/(?:images|api\/media)\//.test(value)) return new URL(value,'https://api.vantanoir.store').href;
  try { const url = new URL(value); return url.protocol === 'https:' && ['api.vantanoir.store','vantanoir.store','www.vantanoir.store'].includes(url.hostname) ? url.href : ''; } catch { return ''; }
}
export function buildTechPack(product, images = [], variants = [], options = {}) {
  let details = {};
  try { details = JSON.parse(product.details_json || '{}'); } catch {}
  if (!details || typeof details !== 'object' || Array.isArray(details)) details = {};
  const unique = new Map();
  for (const image of [{image_url:product.image_url,image_alt:product.image_alt}, ...images.filter(i => !i.product_id || i.product_id === product.id)]) {
    const url = imageURL(image.image_url);
    if (url) unique.set(url, {...unique.get(url),...image,image_url:url});
  }
  const assetSelection=selectProductAssets({...product,image_url:imageURL(product.image_url)},[...unique.values()],options.color||'');
  const {pictures}=assetSelection;
  details=coreDesignDetails(product,details);
  const guide = details.sizeGuide && typeof details.sizeGuide === 'object' ? details.sizeGuide : {};
  const sections = Array.isArray(guide.sections) ? guide.sections.filter(s=>s && Array.isArray(s.rows)) : [];
  const prepared={...details,features:currentBrandText(details.features),fabric:currentBrandText(details.fabric),
    trims:specPart(details,'trims',/rib|drawcord|cord|tape|elastic|binding|trim/i),
    hardware:specPart(details,'hardware',/zip|snap|button|buckle|eyelet|rivet|toggle|hardware/i),
    stitching:specPart(details,'stitching',/seam|stitch|overlock|bartack|reinforce/i),
    labels:specPart(details,'labels',/label|size tab|hangtag/i)};
  const construction=constructionProposal(product,prepared);
  Object.assign(prepared,construction);
  const targetCompletion=completeDesignTargets(product,details,supplementMeasurements(sections,guide.notes));
  const sizing=sizingFor(product,details,targetCompletion.sections);
  sizing.proposed.push(...targetCompletion.filled);
  return {product, details:prepared, ...assetSelection, sections:sizing.charts, sizing, targetCompletion, regionalReferences:regionalReferences(sizing,details.audience), measurementStatus: guide.status === 'confirmed' ? 'Saved as confirmed — verify signed sample revision' : 'Reference measurements — sample approval required',
    colors:[...new Set(variants.filter(v=>!v.product_id || v.product_id === product.id).map(v=>v.color).filter(Boolean))],
    sizes:PACK_SIZES, region:'China (CN/CH)', releaseStatus:'SAMPLING DRAFT — NOT RELEASED FOR BULK PRODUCTION'};
}
const text = v => typeof v === 'string' || typeof v === 'number' ? String(v) : '';
function box(title, value) {return `<section class="box"><h2>${esc(title)}</h2><p>${esc(text(value) || pending)}</p></section>`;}
function picture(image, label) {if(image?.zoom)return `<figure><div class="detail-zoom"><img src="${esc(image.image_url)}" alt="${esc(label)}" style="transform:scale(${image.zoom});transform-origin:${esc(image.origin)}"></div><figcaption>${esc(label)} · magnification only; confirm on physical sample</figcaption></figure>`;if(image?.crop){const crop=image.crop.join(' ');return `<figure><svg role="img" aria-label="${esc(label)}" viewBox="${crop}" style="width:100%;height:48mm"><image href="${esc(image.image_url)}" width="${image.width}" height="${image.height}"/></svg><figcaption>${esc(label)} · enlarged saved design reference, not a physical sample</figcaption></figure>`;}return `<figure>${image ? `<img src="${esc(image.image_url)}" alt="${esc(image.image_alt || label)}">` : '<div class="missing">No saved image for this direction</div>'}<figcaption>${esc(label)}</figcaption></figure>`;}
const measurements = [['chest','Chest, flat'],['waist','Waist, relaxed'],['waistStretched','Waist, stretched'],['hip','Hip, flat'],['shoulder','Shoulder'],['sleeve','Sleeve'],['length','Length'],['inseam','Inseam'],...Object.entries(EXTRA_POMS).map(([key,[label]])=>[key,label])];
export function renderTechPackHTML(pack) {
 return renderVideoTechPack(pack,{esc,picture,boardDetails,box,measurements,standardNotes,sourceDetails,artworkRule});
}
