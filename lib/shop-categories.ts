import source from "@/data/catalogue-source.json";
import type { CatalogProduct } from "./catalog";
export const SHOP_CATEGORIES = source.categories;
export const SHOP_SECTIONS = ["Tops", "Bottoms", "Dresses", "Matching Sets", "Outerwear", "Accessories"] as const;
export function categoryFor(product: Pick<CatalogProduct,"id"|"category">) {
 const corrected:Record<string,string>={
  'vn-pdf-p01-2-17':'C17',
  'vn-pdf-p07-2-r1-a4':'C12',
  'vn-pdf-p07-2-r1-a5':'C12',
 };
 // Correct reviewed legacy imports only; preserve future admin category changes.
 if(product.category==='Casual and denim sets' && corrected[product.id])return SHOP_CATEGORIES.find(c=>c.id===corrected[product.id]);
 const known=SHOP_CATEGORIES.find(c=>c.name===product.category);
 if(known)return known;
 const id=product.id==="vn-stealth"?"C11":product.id==="vn-windbreaker"?"C13":product.id.includes("performance")?"C12":undefined;
 return SHOP_CATEGORIES.find(c=>c.id===id);
}
export function matchesCategory(product: Pick<CatalogProduct,"id"|"category">, value:string) {
 const c=categoryFor(product);
 return value==="All" || c?.section===value || c?.id===value || c?.name===value || product.category===value;
}
