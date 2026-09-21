import separated from '@/data/catalogue-separated-views.json';
import type { CatalogProduct, CatalogImage } from './catalog';
const mappings = separated as Record<string,Array<{view:string;imageUrl:string}>>;

// Also handles catalog responses retained in an existing database. Only known
// composite URLs are replaced; merchant-uploaded photographs remain untouched.
export function individualProductViews(product: CatalogProduct): CatalogProduct {
  const images=(product.images??[]).flatMap(image=>mappings[image.imageUrl]?.map(view=>({
    ...image,imageUrl:view.imageUrl,imageAlt:`${product.name} — ${image.color}, ${view.view} view`,
  }))??[image]);
  const unique=new Map<string,CatalogImage>();
  for(const image of images)unique.set(`${image.color}:${image.imageUrl}`,image);
  const front=mappings[product.imageUrl]?.[0];
  return {...product,
    imageUrl:front?.imageUrl??product.imageUrl,
    imageAlt:front?`${product.name} — ${product.color}, front view`:product.imageAlt,
    images:[...unique.values()],
    colorways:product.colorways.map(color=>{
      const first=mappings[color.imageUrl]?.[0];
      return first?{...color,imageUrl:first.imageUrl,imageAlt:`${product.name} — ${color.name}, front view`}:color;
    }),
  };
}
