type QualityProduct = {
  id: string; name: string; category: string; status?: string;
  details?: { fabric?: string; fabricWeight?: string; care?: string; priceStatus?: string; availability?: string; audience?: string };
};
export const QUALITY_LABELS = {
  fabric: 'Fabric missing', care: 'Care missing', price: 'Price needs approval',
  preview: 'Design preview', duplicate: 'Similar names — compare designs',
} as const;
export type QualityIssue = keyof typeof QUALITY_LABELS;
export function catalogueQuality<T extends QualityProduct>(products: T[]) {
  const key = (p: T) => `${p.details?.audience ?? 'unisex'}:${p.category}:${p.name.toLowerCase().replace(/^\d+\s+/, '').replace(/^face cap$/, 'cap').trim()}`;
  const counts = new Map<string,number>();
  const active = products.filter(p=>p.status !== 'archived');
  for (const p of active) counts.set(key(p),(counts.get(key(p))??0)+1);
  return active.map(product=>{
    const issues: QualityIssue[] = [];
    if (!product.details?.fabric?.trim()) issues.push('fabric');
    if (!product.details?.care?.trim()) issues.push('care');
    if (product.details?.priceStatus === 'proposed') issues.push('price');
    if (product.details?.availability === 'preview') issues.push('preview');
    if ((counts.get(key(product))??0)>1) issues.push('duplicate');
    return {product,issues};
  });
}
