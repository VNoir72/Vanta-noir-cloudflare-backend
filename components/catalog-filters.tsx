import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CatalogProduct } from '@/lib/catalog';
import { matchesAudience } from '@/lib/catalog-browsing';
import { SHOP_COLLECTIONS, matchesShopCollection, productDrop, type ShopFilters } from '@/lib/shop-collections';
import { categoryFor } from '@/lib/shop-categories';
import { colourFamily } from '@/lib/catalog-colours';
import { swatchBackground } from '@/lib/catalog-swatches';
import { compareSizes } from '@/lib/size-labels';

function FilterSection({title, children}: {title: string; children: ReactNode}) {
  return <details className="dn-filter-section"><summary>{title}<ChevronDown size={16}/></summary><div>{children}</div></details>;
}

export function CatalogFilters({ value, onChange, products, categories, labels, prefix }: {
  value: ShopFilters; onChange: (next: ShopFilters) => void; products: CatalogProduct[];
  categories: {id: string; name: string; section: string}[];
  labels: {source: string; label: string}[]; prefix: string;
}) {
  const audienceProducts = products.filter(p => matchesAudience(p, value.audience));
  const selected = audienceProducts.filter(p => matchesShopCollection(p, value.category));
  const typeId = (p: CatalogProduct) => categoryFor(p)?.id ?? categories.find(c => c.name === p.category)?.id;
  const typed = selected.filter(p => value.productType === 'All' || typeId(p) === value.productType);
  const types = categories.filter(c => selected.some(p => typeId(p) === c.id));
  const drops = [...new Set(typed.map(p => productDrop(p, labels)).filter(Boolean))].sort();
  const dropped = typed.filter(p => value.drop === 'All' || productDrop(p, labels) === value.drop);
  const colors = [...new Map(dropped.flatMap(p => p.colorways).map(c => [colourFamily(c.name), { name: colourFamily(c.name), hex: c.hex }])).values()];
  const sizes = [...new Set(dropped.flatMap(p => p.colorways.flatMap(c => Object.keys(c.stock))))].filter(s => s !== 'Size pending').sort(compareSizes);
  const update = (key: keyof ShopFilters, next: string) => onChange({ ...value, [key]: next });
  return <div className="dn-filter-controls">
    <fieldset><legend>Shop for</legend><div className="dn-audience-options">{[['All','Everyone'],['men','Men'],['women','Women'],['unisex','Unisex']].map(([key,label]) => <label key={key}><input type="radio" name={`${prefix}-audience`} checked={value.audience === key} onChange={() => onChange({audience:key,category:'All',productType:'All',drop:'All',color:'All',size:'All',price:value.price})}/><span>{label}</span></label>)}</div></fieldset>
    <fieldset><legend>Collection</legend><div className="dn-collection-options">{['All', ...SHOP_COLLECTIONS].map(collection => <label key={collection}><input type="radio" name={`${prefix}-collection`} checked={value.category === collection} onChange={() => onChange({...value,category:collection,audience:collection === 'Women' ? 'women' : value.audience,productType:'All',drop:'All',color:'All',size:'All'})}/><span>{collection === 'All' ? 'All collections' : collection}</span></label>)}</div></fieldset>
    <FilterSection title="Product type"><select aria-label="Product type" value={value.productType} onChange={e => onChange({...value,productType:e.target.value,drop:'All',color:'All',size:'All'})}><option value="All">All product types</option>{types.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></FilterSection>
    <FilterSection title="Drop"><select aria-label="Drop" value={value.drop} onChange={e => onChange({...value,drop:e.target.value,color:'All',size:'All'})}><option value="All">All drops</option>{[...new Set([...drops,...(value.drop === 'All' ? [] : [value.drop])])].map(drop => <option key={drop}>{drop}</option>)}</select></FilterSection>
    <FilterSection title="Colour"><div className="dn-filter-colors"><button type="button" aria-pressed={value.color === 'All'} onClick={() => update('color','All')}>All colours</button>{colors.map(({name,hex}) => <button type="button" key={name} aria-pressed={value.color === name} onClick={() => update('color',name)}><i style={{background:swatchBackground(name,hex)}}/>{name}</button>)}</div></FilterSection>
    <FilterSection title="Size"><div className="dn-filter-sizes">{['All',...sizes].map(size => <button type="button" key={size} aria-pressed={value.size === size} onClick={() => update('size',size)}>{size}</button>)}</div></FilterSection>
    <FilterSection title="Price">{[['All','Any price'],['under','Under ₦125,000'],['over','₦125,000 and above']].map(([key,label]) => <label key={key}><input type="radio" name={`${prefix}-price`} checked={value.price === key} onChange={() => update('price',key)}/><span>{label}</span></label>)}</FilterSection>
  </div>;
}
