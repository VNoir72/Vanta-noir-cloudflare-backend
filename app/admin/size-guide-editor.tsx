"use client";
import {MeasurementLibrary} from "./measurement-library";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { compareSizes, STORE_SIZES, SECTION_FIELDS, measurementLabel, referenceSizeGuide, resolveSizeGuide, sizeGuideSchema, type GarmentSizeGuide, type SizeSection } from "@/lib/sizing";
import type { ProductDetails } from "@/lib/product-details";

export function SizeGuideEditor({ productId, value, onChange, sizes = [] }: { sizes?: string[]; productId?: string; value: ProductDetails; onChange: (value: ProductDetails) => void }) {
  const guide = resolveSizeGuide({ id: productId ?? "", details: value }) ?? { status: "reference", notes: "", sections: [] };
  const chartSizes = [...new Set([...sizes,...guide.sections.flatMap(section=>section.rows.map(row=>row.size))])].filter(size=>size!=="Size pending").sort(compareSizes);
  const labels = chartSizes.length ? chartSizes : [...STORE_SIZES];
  const [error, setError] = useState("");
  const save = (next: GarmentSizeGuide) => { setError(""); onChange({ ...value, sizeGuide: next }); };
  const sectionChange = (index: number, next: SizeSection) => save({ ...guide, status: "reference", sections: guide.sections.map((s, i) => i === index ? next : s) });
  const changeStatus = (status: GarmentSizeGuide["status"]) => {
    const parsed = sizeGuideSchema.safeParse({ ...guide, status });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    save(parsed.data);
  };
  return <details className="vn-product-disclosure"><summary>Size &amp; fit charts</summary>
    <MeasurementLibrary onApply={next=>{if(guide.sections.length&&!window.confirm("Replace this product’s current chart with a provisional reference?"))return;save(next);}}/>
    <p>Sizes from this product’s variations appear below. Add a size under Variations to include it in the chart. Enter centimetres with garments laid flat. Chest, waist and hip values are widths across one side; divide a full garment circumference by two before entering it. Lengths stay unchanged.</p>
    {productId && referenceSizeGuide(productId) && <p className="text-sm">The initial charts come from your 100-pair manufacturer package, revision 6 (pages 5, 12 and 16). Width conventions and final measurements must be checked against physical samples. Saving edits overrides the reference for this product only.</p>}
    {!!value.sizeChart.length && !value.sizeGuide && <p className="text-sm">An existing chart is active. It stays active until you save a replacement here. The previous values are retained below.</p>}
    <div className="vn-admin-fields"><label>Measurement approval<Select value={guide.status} onValueChange={next => changeStatus(next as GarmentSizeGuide["status"])}><SelectTrigger aria-label="Measurement approval"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="reference">Provisional — sample approval pending</SelectItem><SelectItem value="confirmed">Published measurements confirmed against samples</SelectItem></SelectContent></Select></label><label>Fit notes<textarea rows={3} maxLength={1500} value={guide.notes} onChange={e => save({ ...guide, notes: e.target.value })}/></label></div>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {guide.sections.length > 0 && <Tabs defaultValue={guide.sections[0].kind} className="mt-5"><TabsList aria-label="Edit garment measurements">{guide.sections.map(section => <TabsTrigger value={section.kind} key={section.kind}>{section.title}</TabsTrigger>)}</TabsList>{guide.sections.map((section, index) => <TabsContent value={section.kind} key={section.kind}>
      <div className="vn-admin-fields"><label>Garment label<input maxLength={60} value={section.title} onChange={e => sectionChange(index, { ...section, title: e.target.value })}/></label></div>
      <Table className="vn-data-table"><TableHeader><TableRow><TableHead scope="col">Size</TableHead>{SECTION_FIELDS[section.kind].map(key => <TableHead scope="col" key={key}>{measurementLabel(key, section.kind)} (cm)</TableHead>)}</TableRow></TableHeader><TableBody>{labels.map(size => <TableRow key={size}><TableHead scope="row">{size}</TableHead>{SECTION_FIELDS[section.kind].map(key => <TableCell key={key}><input className="w-24 border p-2" type="number" min="0.1" max="400" step="0.1" aria-label={`${section.title} ${size} ${measurementLabel(key, section.kind)} in centimetres`} value={section.rows.find(row => row.size === size)?.[key] ?? ""} onChange={e => sectionChange(index, { ...section, rows: labels.map(label => ({ ...(section.rows.find(row => row.size === label) ?? { size: label }), ...(label === size ? { [key]: e.target.value ? Number(e.target.value) : null } : {}) })) })}/></TableCell>)}</TableRow>)}</TableBody></Table>
      <button type="button" className="vn-pill my-3" onClick={() => save({ ...guide, status: "reference", sections: guide.sections.filter((_, i) => i !== index) })}>Remove {section.title} chart</button>
    </TabsContent>)}</Tabs>}
    <div className="flex flex-wrap gap-3 mt-4">{(["top", "bottom", "onepiece"] as const).filter(kind => !guide.sections.some(section => section.kind === kind)).map(kind => <button type="button" className="vn-pill" key={kind} onClick={() => save({ ...guide, status: "reference", sections: [...guide.sections, { kind, title: { top: "Top", bottom: "Trousers", onepiece: "Dress / one-piece" }[kind], rows: labels.map(size => ({ size })) }] })}>Add {kind === "onepiece" ? "dress / one-piece" : kind} chart</button>)}</div>
    <p className="text-sm">Leave unknown measurements blank. Editing measurements marks the guide provisional again. Only mark it confirmed after checking the relevant sizes and measurement method with your manufacturer. Use Save product to publish these changes.</p>
  </details>;
}
