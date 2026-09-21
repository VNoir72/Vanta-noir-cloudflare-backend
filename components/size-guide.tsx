"use client";
import { useState } from "react";
import { Ruler } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productDetails } from "@/lib/product-details";
import { STORE_SIZES, compareSizes, SIZE_NAMES, SECTION_FIELDS, resolveSizeGuide, resolveDevelopmentTarget, formatMeasurement, measurementLabel, type SizeSection } from "@/lib/sizing";
import { GarmentTargets } from "./garment-targets";
import { readStorage, writeStorage } from "@/lib/browser-store";
import type { CatalogProduct } from "@/lib/catalog";
import { trackEvent } from "@/lib/analytics";
import { BodySizeReference, bodyReferenceFor } from "@/components/body-size-reference";

const UNIT_KEY = "vanta-noir-size-unit";
type Props = { product: CatalogProduct; selectedSize?: string; onSelectSize?: (size: string) => void; stock?: Record<string, number> };
export function SizeGuide({ product, selectedSize = "", onSelectSize, stock }: Props) {
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState("");
  const details = productDetails(product.details);
  const guide = resolveSizeGuide({ id: product.id, details });
  const developmentTarget = resolveDevelopmentTarget({ id: product.id, details });
  const bodyReference = bodyReferenceFor(product.id);
  const legacyColumns = (["chest", "waist", "hip", "inseam", "length"] as const).filter(key => details.sizeChart.some(row => row[key]));
  const labels = [...new Set([...Object.keys(stock ?? {}),...(guide?.sections.flatMap(s=>s.rows.map(r=>r.size)) ?? [])])].filter(s=>s!=="Size pending").sort(compareSizes);
  const selectable = stock ? Object.keys(stock).filter(s=>s!=="Size pending").sort(compareSizes) : labels;
  const unavailable = Boolean(chosen && stock && !stock[chosen]);
  const changeUnit = (next: "cm" | "in") => { setUnit(next); writeStorage(UNIT_KEY, next); };
  function chart(section: SizeSection) {
    const columns = SECTION_FIELDS[section.kind].filter(key => section.rows.some(row => row[key] != null));
    const rows: SizeSection["rows"] = labels.map(size => section.rows.find(row => row.size === size) ?? { size });
    return columns.length ? <Table className="dn-sizing-table" tabIndex={0}>
      <TableCaption className="sr-only">{product.name}: {section.title}, flat garment measurements in {unit}</TableCaption>
      <TableHeader><TableRow><TableHead scope="col">Size</TableHead>{columns.map(key => <TableHead scope="col" key={key}>{measurementLabel(key, section.kind)}<span>({unit})</span></TableHead>)}</TableRow></TableHeader>
      <TableBody>{rows.map(row => <TableRow key={row.size} data-selected={chosen === row.size}>
        <TableHead scope="row">{row.size}{chosen === row.size && <span className="sr-only">, selected</span>}</TableHead>
        {columns.map(key => <TableCell key={key}>{formatMeasurement(row[key], unit)}</TableCell>)}
      </TableRow>)}</TableBody>
    </Table> : <p>Measurements for this garment are not published yet.</p>;
  }
  return <Dialog open={open} onOpenChange={next => {
    setOpen(next);
    if (next) { setChosen(selectedSize); setUnit(readStorage(UNIT_KEY) === "in" ? "in" : "cm"); trackEvent("size_guide_open", { item_id: product.id }); }
  }}>
    <DialogTrigger asChild><button type="button" className="vn-text-link dn-size-link"><Ruler size={15}/> Size &amp; fit guide</button></DialogTrigger>
    <DialogContent className="vn-commerce-dialog dn-size-guide">
      <div className="dn-size-intro"><span className="dn-eyebrow">A better fit starts here</span><DialogTitle>Size &amp; fit</DialogTitle><DialogDescription>{product.name.replace(/^\d+\s+/, "")}</DialogDescription></div>
      <Tabs defaultValue={!developmentTarget && !guide?.sections.length && !details.sizeChart.length && bodyReference ? "body" : "measurements"} className="dn-size-tabs">
        <TabsList aria-label="Size guide information"><TabsTrigger value="measurements">Garment chart</TabsTrigger>{bodyReference && <TabsTrigger value="body">Body reference</TabsTrigger>}<TabsTrigger value="measure">Measuring</TabsTrigger></TabsList>
        {bodyReference && <TabsContent value="body" className="dn-size-panel"><BodySizeReference productId={product.id} unit={unit} onUnitChange={changeUnit}/></TabsContent>}
        <TabsContent value="measurements" className="dn-size-panel">
          {(developmentTarget || guide?.status === "reference") && <p className="dn-sizing-reference"><strong>Provisional size guide{developmentTarget ? ` · ${developmentTarget.revision}` : ''}</strong>Based on sampling specifications. Final garment measurements are awaiting sample approval.</p>}
          {(guide?.notes || details.fit) && <p className="dn-size-fit">{details.fit || guide?.notes}</p>}
          {details.modelSizing && <p className="dn-size-fit">{details.modelSizing}</p>}
          <div className="dn-size-toolbar"><span>{guide ? "Garment measurements" : `${details.measurementType === "body" ? "Body" : "Garment"} measurements`}</span><div className="dn-size-units" role="group" aria-label="Measurement unit">{(["cm", "in"] as const).map(value => <button type="button" aria-pressed={unit === value} onClick={() => changeUnit(value)} key={value}>{value === "in" ? "inches" : "cm"}</button>)}</div></div>
          {developmentTarget ? <>
            <p className="dn-size-explainer">The same measurements appear in the manufacturer catalogue. Widths are measured across the garment laid flat, unless the row says circumference.</p>
            <GarmentTargets productId={product.id} unit={unit} compact/>{chosen && !(STORE_SIZES as readonly string[]).includes(chosen) && <p role="status">Measurements for {chosen} are not yet published.</p>}
            <p className="dn-size-scroll-hint">Scroll the table sideways for all five sizes →</p>
            {guide?.sections.length && onSelectSize ? <div className="dn-guide-sizes" role="group" aria-label="Choose a size">{selectable.map(size => <button type="button" key={size} aria-pressed={chosen === size} aria-label={`${(SIZE_NAMES as Record<string,string>)[size] ?? size} (${size})${stock && !stock[size] ? ", out of stock" : ""}`} onClick={() => setChosen(size)}>{size}</button>)}</div> : null}
          </> : guide?.sections.length ? <>
            <p className="dn-size-explainer">Measured with the garment laid flat. Widths are one side only, not body circumferences.</p>
            <div className="dn-guide-sizes" role="group" aria-label="Compare a size">{selectable.map(size => <button type="button" key={size} aria-pressed={chosen === size} aria-label={`${(SIZE_NAMES as Record<string,string>)[size] ?? size} (${size})${stock && !stock[size] ? ", out of stock" : ""}`} onClick={() => setChosen(size)}>{size}</button>)}</div>
            {chosen && guide.sections.some(section => !section.rows.some(row => row.size === chosen && SECTION_FIELDS[section.kind].some(key => row[key] != null))) && <p className="dn-sizing-reference" role="status">{chosen} measurements are not yet published for every piece. Ask customer care about fit before ordering.</p>}
            <Tabs defaultValue={guide.sections[0].kind} className="dn-garment-tabs"><TabsList aria-label="Garment in this purchase">{guide.sections.map(section => <TabsTrigger value={section.kind} key={section.kind}>{section.title}</TabsTrigger>)}</TabsList>{guide.sections.map(section => <TabsContent value={section.kind} key={section.kind}>{chart(section)}</TabsContent>)}</Tabs>
            <p className="dn-size-scroll-hint">Scroll the table sideways for all measurements →</p>
            {guide.sections.some(section => labels.some(size => !section.rows.some(row => row.size === size && SECTION_FIELDS[section.kind].some(key => row[key] != null)))) && <p className="dn-size-explainer">— means the measurement is not yet available.</p>}
            <p className="dn-size-explainer">{guide.sections.length > 1 ? "One size covers the full set. Check each piece before choosing. " : ""}The same size label can have different measurements for different fits. Compare with a similar garment you own.</p>
          </> : !guide && details.sizeChart.length && legacyColumns.length ? <>
            <p className="dn-size-explainer">Check the measuring notes below before comparing widths and circumferences.</p>
            <Table className="dn-sizing-table"><TableCaption className="sr-only">{product.name} measurements in {unit}</TableCaption><TableHeader><TableRow><TableHead scope="col">Size</TableHead>{legacyColumns.map(key => <TableHead scope="col" key={key}>{key} ({unit})</TableHead>)}</TableRow></TableHeader><TableBody>{details.sizeChart.map((row, i) => <TableRow key={`${row.size}-${i}`}><TableHead scope="row">{row.size}</TableHead>{legacyColumns.map(key => <TableCell key={key}>{formatMeasurement(row[key], unit)}</TableCell>)}</TableRow>)}</TableBody></Table>
          </> : <p>Measurements for this piece are not published yet. Ask customer care for help choosing a size.</p>}
          {details.sizeNotes && <p className="dn-size-explainer dn-preserve-lines">{details.sizeNotes}</p>}
          {onSelectSize && guide?.sections.length ? <div className="dn-size-action"><button className="dn-primary" type="button" disabled={!chosen || unavailable} onClick={() => { onSelectSize(chosen); setOpen(false); }}>{unavailable ? `${chosen} is sold out in this colour` : chosen ? `Select size ${chosen}` : "Choose a size above"}</button><span>Selecting a size does not add it to your bag.</span></div> : null}
        </TabsContent>
        <TabsContent value="measure" className="dn-measure-help">
          <h3>Compare with a garment you love</h3><p>Lay it flat, smooth out folds and keep the tape straight. Use a hoodie for hoodies, a jacket for jackets and trousers with a similar fit for bottoms.</p>
          <ol><li><strong>Chest &amp; shoulders</strong><span>Chest: straight across 2.5 cm below the underarm seam. Shoulder: across the back from shoulder seam to shoulder seam.</span></li><li><strong>Waist &amp; hips</strong><span>Waist: across the waistband while relaxed. Hips: straight across 20 cm below the top waistband edge, unless the style specifies another point. A stretched waist is shown only where that measurement is available.</span></li><li><strong>Lengths</strong><span>Body: shoulder to hem, excluding the hood or collar. Sleeve: shoulder seam to cuff. Outer leg: top of waistband to hem. Inseam: crotch seam to hem.</span></li></ol>
          <div className="dn-size-body"><h3>Body measurements are different</h3><p>A body circumference goes all the way around you. These flat garment widths go across one side of the clothing. Doubling a width gives the garment circumference, not a recommended body size.</p></div>
          <p>Between sizes? Compare both pieces and allow for your preferred fit and layers. Height and weight alone cannot confirm your size.</p>
        </TabsContent>
      </Tabs>
      <a className="dn-text-link dn-size-contact" href="/contact">Need help? Ask about fit <span aria-hidden="true">↗</span></a>
    </DialogContent>
  </Dialog>;
}
