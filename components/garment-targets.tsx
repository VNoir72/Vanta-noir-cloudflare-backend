import { garmentTarget } from '@/lib/garment-measurements';
export function GarmentTargets({productId,unit='cm',compact=false}:{productId:string;unit?:'cm'|'in';compact?:boolean}){
 const target=garmentTarget(productId);if(!target)return null;
 const value=(cm:number)=>String(Math.round((unit==='in'?cm/2.54:cm)*10)/10);
 return <section className="dn-development-spec" aria-label="Garment measurement targets">{!compact&&<><h3>Garment measurements</h3><p><strong>Provisional measurements</strong></p><p>Final measurements are awaiting sample approval. Ask customer care to confirm fit before ordering.</p></>}
 {target.blocks.map((block,index)=><div key={index}><h4>{block.name}</h4><p>{block.fit}</p><div className="dn-target-table" role="region" aria-label={`${block.name} measurements in ${unit==='cm'?'centimetres':'inches'}`} tabIndex={0}><table><caption>Provisional garment measurements, {unit} · S–XXL</caption><thead><tr><th scope="col">Measurement</th>{['S','M','L','XL','XXL'].map(s=><th key={s} scope="col">{s}</th>)}</tr></thead><tbody>{block.rows.map(row=><tr key={row.label}><th scope="row">{row.label.replace(/^[A-Z]\d+\s+/, '')}</th>{row.values.map((v,i)=><td key={i}>{value(v)}</td>)}</tr>)}</tbody></table></div></div>)}
 {target.accessory&&<dl>{Object.entries(target.accessory).map(([label,cm])=><div key={label}><dt>{label}</dt><dd>{value(cm)} {unit}</dd></div>)}</dl>}
 {!compact&&<p>These are garment dimensions, not body measurements. Compare with a similar garment laid flat.</p>}</section>;
}
