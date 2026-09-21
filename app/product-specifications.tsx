import { GarmentTargets } from '@/components/garment-targets';
import { Plus } from 'lucide-react';
import { resolvedProductDetails } from '@/lib/product-specs';
import { resolveDevelopmentTarget } from '@/lib/sizing';

export function ProductSpecifications({product}:{product:{id?:string;name:string;category:string;details?:unknown}}){
  const d=resolvedProductDetails(product);
  const rows=[['Garment / accessory',d.garmentType],['Fit',d.fit],['Fabric & composition',d.fabric],['Fabric weight',d.fabricWeight],['What’s included',d.contents]].filter(([,value])=>Boolean(value));
  return <section className="dn-product-specs" aria-label="Product specifications">
    <details open><summary>Product details &amp; specs <Plus size={15}/></summary>
      <h3>Key features</h3><ul>{d.features.split(/\n/).map(s=>s.trim()).filter(Boolean).map((s,i)=><li key={i}>{s}</li>)}</ul>
      <dl>{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {d.availability!=='preview' && (!d.fabric || !d.care) && <p>Final fabric and care details are not yet published. Contact us for details before ordering.</p>}
      {d.availability==='preview'&&<p>Design preview. Final construction, fabric and care details are awaiting sample approval.</p>}
    </details>
    <details><summary>Sizing &amp; fit <Plus size={15}/></summary><p>{d.fit||'Fit details awaiting confirmation.'}</p><p>{d.sizeNotes||'Use the Size & fit guide beside the size selector to check available measurements.'}</p>{d.modelSizing&&<p>{d.modelSizing}</p>}<p>Check whether the size guide is provisional or sample-approved before choosing your size.</p></details>
    {product.id && resolveDevelopmentTarget({id:product.id,details:d}) && <details><summary>Garment measurement targets <Plus size={15}/></summary><GarmentTargets productId={product.id}/></details>}
    <details><summary>Care instructions <Plus size={15}/></summary><p>{d.care||'Care instructions awaiting confirmation for the final fabric and trims.'}</p></details>
  </section>;
}
