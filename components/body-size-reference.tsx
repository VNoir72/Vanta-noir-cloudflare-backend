import references from '@/data/body-size-references.json';
import mappings from '@/data/product-body-size-profiles.json';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
type BodyReference = { title: string; brand: string; sourceUrl: string; checked: string; fields: string[]; rows: Array<{size: string; chest?: number[]; bust?: number[]; waist?: number[]; hip?: number[]; bandCup?: string}> };

export function bodyReferenceFor(productId: string) {
  const key = (mappings as Record<string, string>)[productId];
  return key ? (references as Record<string, BodyReference>)[key] : null;
}

export function BodySizeReference({ productId, unit, onUnitChange }: { productId: string; unit: 'cm' | 'in'; onUnitChange: (unit: 'cm' | 'in') => void }) {
  const ref = bodyReferenceFor(productId);
  if (!ref) return null;
  const bra = ref.fields.includes('bandCup');
  const range = (values: number[]) => values.map(value => String(Math.round(value * (unit === 'cm' ? 2.54 : 1) * 10) / 10)).join('–');
  return <div className="dn-body-reference">
    <p className="dn-sizing-reference"><strong>Body-size reference · S–XXL</strong>Reference sizing from comparable {ref.brand} garments. Final Vanta Noir fit awaits sample confirmation.</p>
    <div className="dn-size-toolbar"><span>{ref.title}</span>{!bra && <div className="dn-size-units" role="group" aria-label="Body measurement unit">{(['cm', 'in'] as const).map(value => <button key={value} type="button" aria-pressed={unit === value} onClick={() => onUnitChange(value)}>{value === 'in' ? 'inches' : 'cm'}</button>)}</div>}</div>
    <p className="dn-size-explainer">{bra ? 'Compare your usual US band and cup size. Cup letters and alpha sizes vary by brand; band and bust measurements must be checked for the Vanta Noir sample.' : 'Measure around your body. These are full circumferences, not flat garment widths. Centimetres are converted from the source’s inch values.'}</p>
    <Table className="dn-sizing-table"><TableCaption>External reference only — not confirmed Vanta Noir garment measurements.</TableCaption><TableHeader><TableRow><TableHead scope="col">Size</TableHead>{ref.fields.map(field => <TableHead key={field} scope="col">{field === 'bandCup' ? 'US band / cup' : `${field === 'hip' ? 'Hips' : field[0].toUpperCase()+field.slice(1)} (${unit})`}</TableHead>)}</TableRow></TableHeader><TableBody>{ref.rows.map(row => <TableRow key={row.size}><TableHead scope="row">{row.size}</TableHead>{ref.fields.map(field => <TableCell key={field}>{field === 'bandCup' ? row.bandCup : range((row as unknown as Record<string, number[]>)[field])}</TableCell>)}</TableRow>)}</TableBody></Table>
    <p className="dn-size-explainer">{bra ? 'Support, stretch and cup construction affect bra fit. Confirm these details against the sample before choosing a size.' : 'Tops: compare chest or bust. Bottoms: compare waist and hips. Sets: check both pieces. Oversized, fitted and cropped styles require their own finished-garment measurements; do not add or subtract a size automatically.'}</p>
    <p className="dn-size-explainer">{bra ? 'Measure snugly around the ribcage directly below the bust, then around the fullest bust. Keep the tape level and share both measurements when asking us to confirm fit.' : 'Wrap the tape level around the fullest chest or bust, natural waist and widest hips. Keep it comfortably snug. If measurements span sizes, ask us to confirm the fit before ordering.'}</p>
    <a className="dn-text-link" href={ref.sourceUrl} target="_blank" rel="noopener noreferrer">View the original {ref.brand} chart ↗</a>
    <p className="dn-size-explainer">Source checked {ref.checked}. XXL is also labelled 2XL by some brands. </p>
  </div>;
}
