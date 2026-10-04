import { garmentName } from './product-names';
import type { CatalogProduct } from './catalog';

// Card badges describe the garment; navigation categories may group several types.
export function productCardLabel(product: Pick<CatalogProduct,'id'|'name'|'category'|'details'>): string {
  // This photographed outfit includes both the knit jacket and matching shorts.
  const verified:Record<string,string> = {
    'vn-pdf-p06-3-r1-c5':'Knit track set',
    'vn-pdf-p06-3-r1-c3':'Panelled jacket and shorts set',
    'vn-pdf-p06-3-r1-c4':'Half-zip anorak and shorts set',
  };
  if (verified[product.id]) return verified[product.id];
  const garment = product.details?.garmentType?.trim() || product.name.trim();
  return garmentName(garment).split(/\s+[—–]\s+/)[0].trim() || product.category.split(' · ')[0];
}
