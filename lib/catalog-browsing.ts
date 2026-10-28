import type { CatalogProduct } from './catalog';

export const AUDIENCES = ['All', 'women', 'men', 'unisex'] as const;
export type Audience = typeof AUDIENCES[number];
export function validAudience(value: unknown): Audience | undefined {
  return AUDIENCES.includes(value as Audience) ? value as Audience : undefined;
}
export function matchesAudience(product: CatalogProduct, audience: string) {
  return audience === 'All' || (product.details?.audience ?? 'unisex') === audience;
}
export type BrowseContext = { audience: string; category: string; collection: string; query: string; color?: string; size?: string; price?: string; sort?: string; saved?: boolean; minPrice?: number; maxPrice?: number; drop?: string; inStock?: boolean };
export function browseParams(context: BrowseContext) {
  const params = new URLSearchParams({ audience: validAudience(context.audience) ?? 'All', category: context.category });
  if (context.collection !== 'All') params.set('collection', context.collection);
  if (context.query) params.set('q', context.query);
  for (const key of ['color','size','price','sort'] as const) {
    const value=context[key]; if(value && value!=='All' && value!=='featured') params.set(key,value);
  }
  if(context.minPrice && context.minPrice>0) params.set('minPrice',String(context.minPrice));
  if(context.maxPrice !== undefined && context.maxPrice<10000000) params.set('maxPrice',String(context.maxPrice));
  if(context.drop && context.drop!=='All') params.set('drop',context.drop);
  if(context.inStock) params.set('inStock','1');
  if(context.saved) params.set('saved','1');
  return params;
}
export function collectionLink(context: BrowseContext) {
  return `/?${browseParams(context)}#collection`;
}
export function productLink(slug: string, colour: string, context: BrowseContext) {
  const params = browseParams(context); params.set('colour', colour);
  return `/products/${encodeURIComponent(slug)}?${params}`;
}
