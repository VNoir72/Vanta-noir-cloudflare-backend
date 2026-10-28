import type { CatalogProduct } from './catalog';
type Image = {imageUrl:string;imageAlt:string;color?:string};
export function garmentView(image:Image):string {
  const alt=image.imageAlt||'';
  // Direction labels outrank words such as "back" or "detail" in a design name.
  const explicit=alt.match(/\b(front|back|left|right|side)\s+view\s*$/i);
  if(explicit)return explicit[1].toLowerCase();
  if(/(?:;|—|,)\s*(?:.*\s)?(?:detail|close[ -]?up|swatch)\b/i.test(alt))return 'detail';
  const file=image.imageUrl.split('?')[0].match(/-(front|back|left|right|side)(?:-r\d+)?\.[a-z]+$/i);
  if(file)return file[1].toLowerCase();
  if(/\b(detail|close[ -]?up|swatch)\b/i.test(alt))return 'detail';
  return 'reference';
}
export function productGallery(product:CatalogProduct,color:string,main:string,alt:string) {
  const source=[...(product.images??[]).filter(i=>!i.color||i.color===color)];
  if(!source.some(i=>i.imageUrl===main))source.unshift({imageUrl:main,imageAlt:alt,color});
  const images=source.filter((i,n)=>i.imageUrl&&source.findIndex(j=>j.imageUrl===i.imageUrl)===n);
  const primary:Image[]=[];
  for(const view of ['front','back','left','right']){
    const found=images.find(i=>garmentView(i)===view);
    if(found)primary.push(found);
  }
  // Legacy side views are shown honestly as Side; never relabel a mirrored image.
  if(!primary.some(i=>['left','right'].includes(garmentView(i)))){
    const side=images.find(i=>garmentView(i)==='side');if(side)primary.push(side);
  }
  if(!primary.length){const reference=images.find(i=>garmentView(i)==='reference');if(reference)primary.push(reference);}
  return {primary,details:images.filter(i=>!primary.includes(i))};
}
