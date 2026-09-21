import groups from '@/data/catalogue-colourway-groups.json';
import { variantId, type CatalogProduct } from './catalog';

export type ColourwayGroup = { product_ids: string[]; recommended_name: string; audience: string; collection: string; reviewed: boolean };

// Presentation grouping only. Each colour retains the original product and
// variant IDs used for stock, orders, saved items, measurements and reviews.
export function catalogStyles(products: CatalogProduct[], definitions: ColourwayGroup[] = groups) {
  const byId = new Map(products.map(p => [p.id,p]));
  const replacements = new Map<string,CatalogProduct>();
  const hidden = new Set<string>();
  for (const group of definitions) {
    if (!group.reviewed) continue;
    const members = group.product_ids.map(id=>byId.get(id)).filter((p):p is CatalogProduct => Boolean(p));
    if (members.length < 2 || members.some(p=>p.details?.audience!==group.audience || p.details?.collection!==group.collection || p.category!==members[0].category || p.priceKobo!==members[0].priceKobo || p.details?.availability!==members[0].details?.availability || p.details?.priceStatus!==members[0].details?.priceStatus)) continue;
    const colourNames = members.flatMap(p=>p.colorways.map(c=>c.name.toLowerCase().trim()));
    if (new Set(colourNames).size !== colourNames.length) continue;
    if (members.some(p=>hidden.has(p.id)||replacements.has(p.id))) continue;
    const primary=members[0];
    const colorways=members.flatMap(p=>p.colorways.map(c=>({...c,sourceProductId:p.id,sourceSlug:p.slug,variantIds:Object.fromEntries(Object.keys(c.stock).map(size=>[size,c.variantIds?.[size]??variantId(p.id,size,c.name)]))})));
    const style={...primary,name:group.recommended_name,colorways,images:members.flatMap(p=>p.images??[])};
    replacements.set(primary.id,style);
    for(const member of members.slice(1))hidden.add(member.id);
  }
  return products.filter(p=>!hidden.has(p.id)).map(p=>replacements.get(p.id)??p);
}
