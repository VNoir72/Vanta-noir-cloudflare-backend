import type { CatalogProduct, CatalogColorway } from './catalog';
type Entry = { product: CatalogProduct; color: CatalogColorway; key: string };
// Keep each product in its first matching position. A swatch changes only that
// product's displayed variant, never its position in the catalogue.
export function stableProductCards(candidates: Entry[], selected: Record<string,string>): Entry[] {
  const products = new Map<string,Entry>();
  for (const entry of candidates) {
    if (products.has(entry.product.id)) continue;
    const color = candidates.find(candidate=>candidate.product.id===entry.product.id && candidate.color.slug===selected[entry.product.id])?.color ?? entry.color;
    products.set(entry.product.id,{product:entry.product,color,key:`${color.sourceProductId??entry.product.id}:${color.slug}`});
  }
  return [...products.values()];
}
