import approvedViews from '@/data/catalogue-approved-view-updates.json';
import { garmentName } from './product-names';
import separated from '@/data/catalogue-separated-views.json';
import type { CatalogProduct, CatalogImage } from './catalog';
const mappings = separated as Record<string,Array<{view:string;imageUrl:string}>>;

// Also handles catalog responses retained in an existing database. Only known
// composite URLs are replaced; merchant-uploaded photographs remain untouched.
export function individualProductViews(product: CatalogProduct): CatalogProduct {
  product={...product,name:garmentName(product.name)};
  const images=(product.images??[]).flatMap(image=>mappings[image.imageUrl]?.map(view=>({
    ...image,imageUrl:view.imageUrl,imageAlt:`${product.name} — ${image.color}, ${view.view} view`,
  }))??[image]);
  const unique=new Map<string,CatalogImage>();
  for(const image of images)unique.set(`${image.color}:${image.imageUrl}`,image);
  const front=mappings[product.imageUrl]?.[0];
  return applyApprovedViews({...product,
    imageUrl:front?.imageUrl??product.imageUrl,
    imageAlt:front?`${product.name} — ${product.color}, front view`:product.imageAlt,
    images:[...unique.values()],
    colorways:product.colorways.map(color=>{
      const first=mappings[color.imageUrl]?.[0];
      return first?{...color,imageUrl:first.imageUrl,imageAlt:`${product.name} — ${color.name}, front view`}:color;
    }),
  });
}

// Reviewed source images only: never replace a merchant-uploaded photo.
function applyApprovedViews(product: CatalogProduct): CatalogProduct {
 const updates=approvedViews.filter(row=>row.productId===product.id);
 if(!updates.length)return product;
 let images=[...(product.images??[])],colorways=[...product.colorways];
 for(const row of updates){
  const color=colorways.find(c=>c.name===row.color);
  if(!color||![row.legacyFront,row.views.front].includes(color.imageUrl))continue;
  const owned=new Set([...row.legacyImages,...Object.values(row.views)]);
  images=images.filter(image=>image.color!==row.color||!owned.has(image.imageUrl));
  for(const [view,imageUrl] of Object.entries(row.views))images.push({color:row.color,imageUrl,imageAlt:`${product.name} — ${row.color}, ${view} view`});
  colorways=colorways.map(c=>c.name===row.color?{...c,imageUrl:row.views.front,imageAlt:`${product.name} — ${row.color}, front view`}:c);
 }
 const primary=updates.find(row=>row.legacyFront===product.imageUrl);
 return {...product,colorways,images,imageUrl:primary?.views.front??product.imageUrl};
}
