import type { CatalogProduct } from './catalog-runtime';

export type ColourwayGroup = { product_ids: string[]; recommended_name: string; audience: string; collection: string; reviewed: boolean };

// A product is a design, not a similar name or colour. Never substitute another
// record's description, measurements, artwork or images when opening its URL.
// Colour variants belong together only when saved under the same product ID.
export function catalogStyles(products: CatalogProduct[], _definitions?: ColourwayGroup[]) {
  return products;
}
