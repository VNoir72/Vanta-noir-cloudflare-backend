import type { CatalogProduct } from './catalog';
import { categoryFor } from './shop-categories';
import { shopperCollectionLabel } from './catalog-search';

export const SHOP_COLLECTIONS = ['Streetwear', 'Activewear', 'Outerwear', 'Bottoms', 'Jerseys', 'Women', 'Essentials', 'Accessories'] as const;

// Collections are shopper-facing edits. Product types remain the catalogue's
// existing categories, so inventory and admin assignments are not rewritten.
export function matchesShopCollection(product: CatalogProduct, collection: string) {
  const category = categoryFor(product);
  const id = category?.id;
  switch (collection) {
    case 'All': return true;
    case 'Women': return product.details?.audience === 'women';
    case 'Streetwear': return ['C01','C02','C05','C06','C11','C14','C25'].includes(id ?? '');
    case 'Activewear': return ['C04','C09','C12','C15','C26','C27'].includes(id ?? '') || (id === 'C10' && /mesh|basketball|compression|cycling|sport/i.test(product.details?.garmentType ?? product.name));
    case 'Outerwear': return category?.section === 'Outerwear' || id === 'C13';
    case 'Bottoms': return category?.section === 'Bottoms';
    case 'Jerseys': return id === 'C03';
    case 'Essentials': return ['C01','C04','C20'].includes(id ?? '');
    case 'Accessories': return category?.section === 'Accessories';
    // Keep old shared URLs and custom admin product types usable.
    default: return category?.id === collection || category?.section === collection || product.category === collection;
  }
}

export function productDrop(product: CatalogProduct, labels: {source: string; label: string}[] = []) {
  if (product.id === 'vn-stealth') return 'STEALTH';
  const source = product.details?.collection;
  if (!source) return '';
  const renamed = labels.find(row => row.source === source)?.label;
  if (renamed) return renamed;
  // Import batches and garment sections are not branded drops. Do not invent
  // SHELL/VD assignments for products that have not been assigned those names.
  if (/\bbatch\s*\d+/i.test(source) || ['Tops','Bottoms','Matching Sets','Outerwear','Accessories','Dresses'].includes(source)) return '';
  return shopperCollectionLabel(source, labels);
}

export type ShopFilters = { audience: string; category: string; productType: string; drop: string; color: string; size: string; price: string };
export const EMPTY_SHOP_FILTERS: ShopFilters = { audience: 'All', category: 'All', productType: 'All', drop: 'All', color: 'All', size: 'All', price: 'All' };
