// Exact product/asset pairs reviewed against saved design references. Decorative
// lettering belongs to the design; approval here does not release factory artwork.
const base='https://api.vantanoir.store/api/media/products/';
const boards={
 'vn-street-block-party':'7e8c6956-1300-5742-b3c4-402a539d5301',
 'vn-street-frequency':'74809d29-f25a-5808-8948-807d2645a3e7',
 'vn-street-switch':'239ede98-4269-576e-9893-f2e977430b50',
 'vn-street-courtside':'bb9aa531-d026-5b0a-8305-8d9a845c8f1d',
 'vn-street-lowline':'292f0532-43b4-5a3e-b240-220be36dd17e',
 'vn-street-night-service':'8b3063dd-a49b-5e6b-a49f-5b6808c20840',
 'vn-street-offset':'3993f4ca-ad34-5e48-bb9e-fd37fef520bf',
 'vn-street-static':'c4ff6934-af4e-513d-a203-ef30bdd41d2d',
 'vn-street-after-hours':'d3f161e2-f9f4-50c5-a2f2-aab2a7a071f0',
 'vn-street-motion-club':'eaf2a2f4-45e8-5a00-9a0e-1f50f28644f1',
 'vn-aperture-frame-72':'757744b3-07b5-5b78-b5c8-61001f913be8',
 'vn-aperture-contour':'f3476178-7bb2-554b-9f6e-6182d4c24de7'
};
export const assetManifest=Object.fromEntries(Object.entries(boards).map(([id,key])=>[id,[{image_url:base+key+'.webp',role:'board'}]]));
assetManifest['vn-graphic-eclipse-runner-tee']=['Front','Back','Left','Right'].map((role,i)=>({image_url:base+`df016003-0006-4000-8000-00000000000${i+1}.webp`,role,width:1254,height:1254}));
// This board includes styling trousers. The pack is for the shirt only.
assetManifest['vn-aperture-afterimage']=['Front','Back','Left','Right'].map((role,i)=>({image_url:base+'20261007-b006.webp',role,width:1536,height:1024,crop:[[0,50,441,370],[442,50,421,370],[864,50,318,370],[1183,50,353,370]][i]}));
export function reviewedAssets(id,images){
 const allowed=assetManifest[id]||[];
 return allowed.flatMap(asset=>{const found=images.find(i=>i.image_url===asset.image_url);return found?[{...found,...asset,image_alt:asset.role==='board'?found.image_alt:asset.role}]:[];});
}
export function reviewedDetails(id,pictures){
 if(id==='vn-graphic-eclipse-runner-tee'){
  const front=pictures.find(i=>i.role==='Front'),back=pictures.find(i=>i.role==='Back'),right=pictures.find(i=>i.role==='Right');
  return [[front,[300,90,650,250],'Neck rib and shoulder seam'],[front,[350,930,650,240],'Original VANTA NOIR lettering and hem'],[back,[480,180,300,250],'Back crescent / spire artwork'],[right,[400,300,430,440],'Sleeve print and hem continuity']].filter(([source])=>source).map(([source,crop,label])=>({...source,crop,image_alt:label}));
 }
 if(id==='vn-aperture-afterimage'&&pictures[0])return [[220,100,130,190,'Collar / placket reference'],[495,85,290,140,'Layered rear yoke / inset'],[100,220,300,195,'Engineered front print / hem']].map(([x,y,w,h,label])=>({...pictures[0],crop:[x,y,w,h],image_alt:label}));
 return [];
}
export const artworkRule='Preserve this style’s original artwork, black-and-white treatment where specified, and decorative VANTA NOIR lettering: typeface, spacing, orientation, proportions and placement. Do not replace decorative lettering with a standard wordmark or add an emblem. Corporate labels must use the current approved master; never substitute an old-generation logo. Stop and resolve any conflict between views or written artwork instructions before cutting.';

const directionNames=['Front','Back','Left','Right'];
export function imageRole(image){
 const alt=String(image.image_alt||'');
 if(/close[ -]?up|detail|swatch/i.test(alt))return 'Detail';
 if(/board|concept|four.view|4.view/i.test(alt))return 'board';
 for(const role of directionNames)if(new RegExp('\\b'+role+'\\b','i').test(alt))return role;
 const file=String(image.image_url||'').split('/').pop().split('?')[0];
 for(const role of directionNames)if(new RegExp('(?:^|[-_])'+role+'(?:[-_.]|$)','i').test(file))return role;
 if(/\bside\b/i.test(alt)||/[-_]side[_.-]/i.test(file))return 'Left';
 return 'Reference';
}
export function selectProductAssets(product,images,requestedColor=''){
 // Inputs are the current saved gallery, scoped by the caller to this product.
 // A design reference is not a corporate-logo approval or a bulk-production proof.
 const safe=images.filter(i=>! /old[- ]?(?:generation|logo)|legacy[- ]?logo|speed[- ]?emblem/i.test(`${i.image_alt||''} ${i.image_url||''}`));
 const colors=[...new Set(safe.map(i=>i.color).filter(Boolean))];
 const primary=safe.find(i=>i.image_url===product.image_url);
 const selectedColor=colors.includes(requestedColor)?requestedColor:primary?.color||colors[0]||'';
 const selected=safe.filter(i=>selectedColor?i.color===selectedColor:!i.color);
 // Uncoloured boards may only be used when the gallery has no colour assignment.
 const reviewed=reviewedAssets(product.id,selected);
 const replacements=new Set(reviewed.map(i=>i.image_url));
 // Never reuse a curated board from another product as an unreviewed fallback.
 const foreign=new Set(Object.entries(assetManifest).filter(([id])=>id!==product.id).flatMap(([,rows])=>rows.map(i=>i.image_url)));
 const pictures=[...reviewed,...selected.filter(i=>!replacements.has(i.image_url)&&!foreign.has(i.image_url)).map(i=>({...i,role:imageRole(i),reviewStatus:'Saved design reference — artwork approval not established'}))];
 return {pictures,selectedColor,imageColors:colors,withheld:safe.length<images.length};
}
export function sourceDetails(id,pictures){
 const curated=reviewedDetails(id,pictures);if(curated.length)return curated;
 const saved=pictures.filter(i=>i.role==='Detail');if(saved.length)return saved.slice(0,4);
 // Magnify actual saved views, without inventing close-up photography or construction.
 const front=pictures.find(i=>i.role==='Front'),back=pictures.find(i=>i.role==='Back');
 return [[front,'50% 25%','Front: upper area'],[front,'50% 75%','Front: lower area'],[back,'50% 35%','Back: artwork / construction area']].filter(([source])=>source).map(([source,origin,label])=>({...source,zoom:2,origin,image_alt:label+' — enlarged saved view'}));
}
