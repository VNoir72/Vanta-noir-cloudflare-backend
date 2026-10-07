import {sizingFor,standardNotes} from './manufacturer-sizing.mjs';
export const PACK_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pending = 'Pending specification';
const reviewedBoards = new Set(["7e8c6956-1300-5742-b3c4-402a539d5301", "74809d29-f25a-5808-8948-807d2645a3e7", "239ede98-4269-576e-9893-f2e977430b50", "bb9aa531-d026-5b0a-8305-8d9a845c8f1d", "292f0532-43b4-5a3e-b240-220be36dd17e", "8b3063dd-a49b-5e6b-a49f-5b6808c20840", "3993f4ca-ad34-5e48-bb9e-fd37fef520bf", "c4ff6934-af4e-513d-a203-ef30bdd41d2d", "d3f161e2-f9f4-50c5-a2f2-aab2a7a071f0", "eaf2a2f4-45e8-5a00-9a0e-1f50f28644f1", "757744b3-07b5-5b78-b5c8-61001f913be8", "f3476178-7bb2-554b-9f6e-6182d4c24de7"].map(key=>`https://api.vantanoir.store/api/media/products/${key}.webp`));
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
  if (/^\/(?:images|api\/media)\//.test(value)) return value;
  try { const url = new URL(value); return url.protocol === 'https:' && ['api.vantanoir.store','vantanoir.store','www.vantanoir.store'].includes(url.hostname) ? url.href : ''; } catch { return ''; }
}
export function buildTechPack(product, images = [], variants = []) {
  let details = {};
  try { details = JSON.parse(product.details_json || '{}'); } catch {}
  if (!details || typeof details !== 'object' || Array.isArray(details)) details = {};
  const unique = new Map();
  for (const image of [{image_url:product.image_url,image_alt:product.image_alt}, ...images.filter(i => !i.product_id || i.product_id === product.id)]) {
    const url = imageURL(image.image_url);
    if (url && !unique.has(url)) unique.set(url, {...image, image_url:url});
  }
  // Only boards individually checked against the current master in the rollout
  // may appear in manufacturer packs. Unreviewed catalogue art is withheld.
  const pictures = [...unique.values()].filter(i=>reviewedBoards.has(i.image_url));
  const guide = details.sizeGuide && typeof details.sizeGuide === 'object' ? details.sizeGuide : {};
  const sections = Array.isArray(guide.sections) ? guide.sections.filter(s=>s && Array.isArray(s.rows)) : [];
  const prepared={...details,features:currentBrandText(details.features),fabric:currentBrandText(details.fabric),
    trims:specPart(details,'trims',/rib|drawcord|cord|tape|elastic|binding|trim/i),
    hardware:specPart(details,'hardware',/zip|snap|button|buckle|eyelet|rivet|toggle|hardware/i),
    stitching:specPart(details,'stitching',/seam|stitch|overlock|bartack|reinforce/i),
    labels:specPart(details,'labels',/label|size tab|hangtag/i)};
  const sizing=sizingFor(product,details,sections);
  return {product, details:prepared, pictures, sections:sizing.charts, sizing, measurementStatus: guide.status === 'confirmed' ? 'Saved as confirmed — verify signed sample revision' : 'Reference measurements — sample approval required',
    colors:[...new Set(variants.filter(v=>!v.product_id || v.product_id === product.id).map(v=>v.color).filter(Boolean))],
    sizes:PACK_SIZES, region:'China (CN/CH)', releaseStatus:'SAMPLING DRAFT — NOT RELEASED FOR BULK PRODUCTION'};
}
const text = v => typeof v === 'string' || typeof v === 'number' ? String(v) : '';
function box(title, value) {return `<section class="box"><h2>${esc(title)}</h2><p>${esc(text(value) || pending)}</p></section>`;}
function picture(image, label) {return `<figure>${image ? `<img src="${esc(image.image_url)}" alt="${esc(image.image_alt || label)}">` : '<div class="missing">View pending</div>'}<figcaption>${esc(label)}</figcaption></figure>`;}
const measurements = [['chest','Chest, flat'],['waist','Waist, relaxed'],['waistStretched','Waist, stretched'],['hip','Hip, flat'],['shoulder','Shoulder'],['sleeve','Sleeve'],['length','Length'],['inseam','Inseam']];
function chart(section) {
  const rows = Array.isArray(section?.rows) ? section.rows : [];
  const columns = measurements.filter(([key])=>rows.some(r=>r?.[key] !== undefined && r?.[key] !== null && r?.[key] !== ''));
  if (!columns.length) columns.push(...measurements.filter(([k])=>['chest','waist','hip','length'].includes(k)));
  return `<section class="box"><h2>${esc(section?.title || 'Garment measurements')} · cm</h2><table><thead><tr><th>Size</th>${columns.map(([,label])=>`<th>${esc(label)}</th>`).join('')}</tr></thead><tbody>${PACK_SIZES.map(size=>{const row=rows.find(r=>r?.size === size) || {};return `<tr><th>${size}</th>${columns.map(([key])=>`<td>${esc(text(row[key]) || 'Pending')}</td>`).join('')}</tr>`;}).join('')}</tbody></table></section>`;
}
export function renderTechPackHTML(pack) {
  const {product:p,details:d,pictures,sections,sizing} = pack;
  const board = pictures.find(i=>/board|concept|four.view|4.view/i.test(i.image_alt || ''));
  const views = ['Front','Back','Left','Right'].map(label=>picture(pictures.find(i=>!(/board|concept|four.view|4.view/i.test(i.image_alt || '')) && new RegExp('\\b'+label+'\\b','i').test(i.image_alt || '')),label));
  const closeups = pictures.filter(i=>/detail|close.up|stitch|hardware|label|trim/i.test(i.image_alt || '') && i!==board);
  const head = page => `<header><div><small>VANTA NOIR · TECHNICAL ARCHIVE</small><h1>${esc(p.name)}</h1><p>${esc(p.id)} · ${esc(p.category)} · Source updated ${esc(p.updated_at || 'unknown')}</p></div><div class="revision">${esc(pack.releaseStatus)}<br>Sheet ${page}/2</div></header>`;
  const footer = '<footer>Current approved logo artwork only. No old-generation logo substitution. Artwork file, placement dimensions, colour and sample must be signed off before production.</footer>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.name)} — Tech pack</title><style>
  *{box-sizing:border-box}body{margin:0;background:#e8e8e5;color:#171b1c;font:12px Arial,sans-serif}.toolbar{padding:18px;background:#17251f;color:white;display:flex;justify-content:space-between;align-items:center}.toolbar button{padding:10px 18px;cursor:pointer}.sheet{background:white;width:400mm;height:277mm;margin:18px auto;padding:9mm;display:block;overflow:hidden}.sheet-content{display:flex;flex-direction:column;gap:4mm}header{display:flex;justify-content:space-between;border-bottom:3px solid #17251f;padding-bottom:4mm}h1{font-size:23px;margin:6px 0}p{margin:5px 0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.4}small{letter-spacing:2px}.revision{max-width:75mm;font-size:11px;font-weight:bold;color:#825d10}.grid{display:grid;grid-template-columns:1.15fr 1.8fr 1fr;gap:4mm}.stack{display:flex;flex-direction:column;gap:3mm}.box{border:1px solid #b9c1bc;padding:3mm;break-inside:avoid}h2{font-size:11px;text-transform:uppercase;letter-spacing:.6px;margin:0 0 2mm;border-bottom:1px solid #d9dfdb;padding-bottom:2mm}figure{margin:0;border:1px solid #d9dfdb;padding:2mm;min-width:0}figure img{width:100%;height:55mm;object-fit:contain}figcaption{font-size:10px;line-height:1.3;margin-top:2mm}.views{display:grid;grid-template-columns:1fr 1fr;gap:2mm}.board img{height:85mm}.missing{height:55mm;display:grid;place-items:center;color:#8c6531;background:#f7f5ef}.two{display:grid;grid-template-columns:1fr 1fr;gap:4mm}table{border-collapse:collapse;width:100%;font-size:11px}th,td{padding:2mm;border:1px solid #ccd3ce;text-align:center}th{background:#edf1ed}.note{color:#795211;background:#fff8e8;padding:3mm}footer{margin-top:auto;border-top:1px solid #17251f;padding-top:3mm;font-size:10px}.details{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}.details img{height:48mm}@page{size:A3 landscape;margin:10mm}@media print{body{background:white}.toolbar{display:none}.sheet{width:400mm;min-height:277mm;margin:0;padding:0;break-after:page}.sheet:last-child{break-after:auto}}@media(max-width:900px){.sheet{width:100%;min-height:0}.grid,.two{grid-template-columns:1fr}}
  </style></head><body><div class="toolbar"><span>Manufacturer sampling pack · A3 landscape · Review both sheets before release · <a style="color:white" href="/api/admin/tech-packs?standard=1" target="_blank">Manufacturer sizing standard PDF</a></span><button id="print">Print / Save PDF</button></div>
  <main><article class="sheet"><div class="sheet-content">${head(1)}<div class="grid"><div class="stack">${box('Style & fit',[d.garmentType,d.fit,d.audience].filter(Boolean).join(' · '))}${box('Fabric specifications',[d.fabric,d.fabricWeight].filter(Boolean).join('\n'))}${box('Colourways',pack.colors.join(' / '))}${box('Care & finishing',d.care)}</div><div class="stack"><section class="box"><h2>Garment views · saved product references</h2>${board ? `<div class="board">${picture(board,'Combined concept board — technical flats require verification')}</div>` : `<div class="views">${views.join('')}</div>`}</section><p class="note">Image references are not verified production artwork. Confirm front, back, left and right views, exact logo generation and scale against the approved master.</p></div><div class="stack">${box('Construction & design details',d.features)}${box('Trims',d.trims)}${box('Hardware',d.hardware)}${box('Stitching',d.stitching)}${box('Labels',d.labels)}</div></div>${footer}</div></article>
  <article class="sheet"><div class="sheet-content">${head(2)}<p class="note">${esc(pack.measurementStatus)}. Flat garment measurements, centimetres. ${sizing.proposed.length} cells are proposed sampling targets (listed below); other cells retain saved references. Missing style dimensions require pattern development. Do not infer measurements from photographs.</p><div class="two">${(sections.length ? sections : [{title:'Garment measurements',rows:d.sizeChart || []}]).map(chart).join('')}</div>${sizing.proposed.length?box('Proposed cells - not sample verified',sizing.proposed.map(v=>`${v.section} ${v.size} ${v.key}: ${v.value} cm`).join('; ')):''}<div class="two"><section class="box"><h2>Regional size schedule · UK / US / China (CN/CH)</h2><table><thead><tr><th>Brand</th><th>UK</th><th>US</th><th>China (CN/CH)</th><th>Body chest / waist / hip cm</th></tr></thead><tbody>${PACK_SIZES.map((size,i)=>`<tr><th>${size}</th><td>${size}</td><td>${size}</td><td>${size}</td><td>${sizing.body.rows[i].chest} / ${sizing.body.rows[i].waist} / ${sizing.body.rows[i].hip}</td></tr>`).join('')}</tbody></table><p>Same brand alpha chart in all three markets; they are not verified international numeric equivalents. China height/girth and body-type designation require the approved body-size chart for this garment.</p></section><div class="stack">${box('Saved style-specific instructions',[d.sizeNotes,d.sizeGuide?.notes].filter(Boolean).join('\n'))}${box('Measurement method, fit allowance & tolerances',standardNotes(sizing))}${box('Production approval','Pending: measurement tolerances; graded XS–XXL sample; BOM supplier codes and consumption; seam/stitch specifications; artwork dimensions; label placement; signed fit and wash tests.')}</div></div><section class="box"><h2>Construction close-ups · exact garment references</h2><div class="details">${closeups.length ? closeups.slice(0,6).map(i=>picture(i,i.image_alt || 'Detail reference')).join('') : boardDetails(board) || ['Seam / stitch detail','Trim / hardware detail','Label / artwork placement'].map(label=>picture(null,label+' — required')).join('')}</div></section>${footer}</div></article></main><script>function fit(){document.querySelectorAll('.sheet').forEach(sheet=>{const inner=sheet.firstElementChild;inner.style.transform='none';inner.style.transformOrigin='top left';const css=getComputedStyle(sheet);const available=sheet.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom)-2;const height=inner.getBoundingClientRect().height;if(available>0&&height>0)inner.style.transform='scale('+Math.min(1,available/height)+')';});}window.addEventListener('load',fit);window.addEventListener('beforeprint',fit);document.getElementById('print').addEventListener('click',()=>{fit();window.print();});</script></body></html>`;
}
