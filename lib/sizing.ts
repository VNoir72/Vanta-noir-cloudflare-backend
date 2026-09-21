import { developmentSizeGuide, garmentTarget } from './garment-measurements';
import { z } from "zod";

// One label system for stock, product options and every garment chart.
export const STORE_SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export type GuideSize = (typeof STORE_SIZES)[number];
export const SIZE_NAMES: Record<GuideSize, string> = { S: "Small", M: "Medium", L: "Large", XL: "Extra large", XXL: "Double extra large" };
export { normalizeSize, VARIANT_SIZES, storeSizeSchema, compareSizes } from './size-labels';
import { storeSizeSchema, compareSizes } from './size-labels';
const measurement = z.number().positive().max(400).nullable().optional();
export const MEASUREMENTS = {
  chest: "Chest width", waist: "Waist width, relaxed", waistStretched: "Waist width, stretched",
  hip: "Hip width", shoulder: "Shoulder width", sleeve: "Sleeve length", length: "Length", inseam: "Inseam",
} as const;
export type MeasurementKey = keyof typeof MEASUREMENTS;
export const SECTION_FIELDS: Record<"top" | "bottom" | "onepiece", MeasurementKey[]> = {
  top: ["chest", "length", "shoulder", "sleeve"],
  bottom: ["waist", "waistStretched", "hip", "length", "inseam"],
  onepiece: ["chest", "waist", "hip", "length", "sleeve", "inseam"],
};
const rowSchema = z.object({ size: storeSizeSchema, chest: measurement, waist: measurement, waistStretched: measurement,
  hip: measurement, shoulder: measurement, sleeve: measurement, length: measurement, inseam: measurement });
export const sizeGuideSchema = z.object({
  status: z.enum(["reference", "confirmed"]).default("reference"),
  notes: z.string().trim().max(1500).default(""),
  sections: z.array(z.object({
    kind: z.enum(["top", "bottom", "onepiece"]),
    title: z.string().trim().min(1).max(60),
    rows: z.array(rowSchema).min(1).max(30),
  })).max(3),
}).superRefine((guide, ctx) => {
  if (new Set(guide.sections.map(s => s.kind)).size !== guide.sections.length) ctx.addIssue({ code: "custom", path: ["sections"], message: "Each garment section may appear only once." });
  if (guide.status === "confirmed" && !guide.sections.length) ctx.addIssue({ code: "custom", path: ["sections"], message: "Add measurements before confirming a guide." });
  guide.sections.forEach((section, sectionIndex) => {
    const path = ["sections", sectionIndex, "rows"];
    // Confirmation covers published measurements. Missing sizes stay explicitly
    // unavailable, so adding XXL cannot invalidate previously saved S–XL charts.
    if (guide.status === "confirmed" && !section.rows.some(row => Object.keys(MEASUREMENTS).some(key => row[key as MeasurementKey] != null))) ctx.addIssue({ code: "custom", path, message: "Add measurements before confirming a garment chart." });
    if (new Set(section.rows.map(row => row.size)).size !== section.rows.length) ctx.addIssue({ code: "custom", path, message: "Use each size only once per garment." });
    section.rows.forEach((row, index) => {
      if (row.waist && row.waistStretched && row.waistStretched < row.waist) ctx.addIssue({ code: "custom", path: [...path, index, "waistStretched"], message: "Stretched waist must be at least the relaxed waist." });
      for (const key of Object.keys(MEASUREMENTS) as MeasurementKey[]) {
        if (row[key] != null && !SECTION_FIELDS[section.kind].includes(key)) ctx.addIssue({ code: "custom", path: [...path, index, key], message: "Measurement does not belong to this garment section." });
      }
      const required: MeasurementKey[] = section.kind === "bottom" ? ["waist", "hip", "length", "inseam"] : ["chest", "length"];
      const hasMeasurements = Object.keys(MEASUREMENTS).some(key => row[key as MeasurementKey] != null);
      if (guide.status === "confirmed" && hasMeasurements && required.some(key => row[key] == null)) ctx.addIssue({ code: "custom", path: [...path, index], message: "Complete the main measurements for each published size before confirming." });
    });
  });
}).transform(guide => ({ ...guide, sections: guide.sections.map(section => ({ ...section, rows: [...section.rows].sort((a, b) => compareSizes(a.size,b.size)) })) }));
export type GarmentSizeGuide = z.infer<typeof sizeGuideSchema>;
export type SizeSection = GarmentSizeGuide["sections"][number];

export function formatMeasurement(cm: number | null | undefined, unit: "cm" | "in") {
  if (cm == null) return "—";
  return String(Math.round((unit === "in" ? cm / 2.54 : cm) * 10) / 10);
}
export function measurementLabel(key: MeasurementKey, kind: SizeSection["kind"]) {
  return key === "length" ? kind === "bottom" ? "Outer leg length" : "Body length" : MEASUREMENTS[key];
}

// Source: VANTA_NOIR_100_PAIR_4_COLORWAY_MANUFACTURER_PACKAGE.pdf, version 6,
// 31 Aug 2026, pages 5, 12 and 16. These are sampling references, NOT approved sizes.
// Standardize to flat garment widths. The performance trouser source lists full
// waist/hip circumferences, unlike the other trouser charts; divide those by two.
// Confirm this measurement convention and the final grade against physical samples.
const top = (title: string, values: number[][]): SizeSection => ({ kind: "top", title, rows: values.map(([chest, length, shoulder, sleeve], i) => ({ size: STORE_SIZES[i], chest, length, shoulder, sleeve })) });
const bottom = (title: string, values: number[][]): SizeSection => ({ kind: "bottom", title, rows: values.map(([waist, hip, length, inseam, waistStretched], i) => ({ size: STORE_SIZES[i], waist, hip, length, inseam, ...(waistStretched ? { waistStretched } : {}) })) });
const performance: GarmentSizeGuide = { status: "reference", notes: "Athletic fit with tapered trousers. Hooded and stand-collar versions share the same base size grade.", sections: [
  top("Jacket", [[52,68,45,63],[54,70,47,64],[56,72,49,65],[58,74,51,66]]),
  bottom("Trousers", [[36,52,100,73,44],[38,54,102,74,47],[40,56,104,75,50],[42,58,106,76,53]]),
] };
const references: Record<string, GarmentSizeGuide> = {
  "vn-stealth": { status: "reference", notes: "Oversized hoodie with dropped shoulders and a baggy trouser fit.", sections: [
    top("Hoodie", [[58,70,56,61],[60,72,58,62],[62,74,60,63],[64,76,62,64]]),
    bottom("Baggy trousers", [[36,58,102,73],[38,60,104,74],[40,62,106,75],[42,64,108,76]]),
  ] },
  "vn-windbreaker": { status: "reference", notes: "Lightweight outerwear. Compare with a jacket you wear over similar layers.", sections: [
    top("Jacket", [[58,70,48,65],[60,72,49.5,66],[62,74,51,67],[64,76,52.5,68]]),
    bottom("Trousers", [[36,54,102,73],[38,56,104,74],[40,58,106,75],[42,60,108,76]]),
  ] },
  "vn-hooded-performance": performance,
  "vn-stand-collar-performance": performance,
};
export function referenceSizeGuide(productId: string): GarmentSizeGuide | null {
  const development = developmentSizeGuide(productId);
  if (development) return sizeGuideSchema.parse(development);
  return references[productId] ? sizeGuideSchema.parse(references[productId]) : null;
}
export function resolveSizeGuide(product: { id: string; details?: { sizeGuide?: GarmentSizeGuide | null; sizeChart?: unknown[] } }): GarmentSizeGuide | null {
  // Merchant-entered charts always take priority over the reference; an explicitly
  // empty guide hides charts. Never guess another product's measurements from its name.
  if (product.details?.sizeGuide) {
    const saved=product.details.sizeGuide;
    const previous=references[product.id];
    // Upgrade only our unchanged legacy four-size sampling guide; merchant edits win.
    if (saved.status==='reference' && previous && saved.notes===previous.notes && JSON.stringify(saved.sections)===JSON.stringify(sizeGuideSchema.parse(previous).sections)) return developmentSizeGuide(product.id) ?? saved;
    return saved;
  }
  if (product.details?.sizeChart?.length) return null;
  return referenceSizeGuide(product.id);
}

// Only expose development targets when they are the active chart. A merchant's
// edited, confirmed, legacy or explicitly hidden chart must keep precedence.
export function resolveDevelopmentTarget(product: { id: string; details?: { sizeGuide?: GarmentSizeGuide | null; sizeChart?: unknown[] } }) {
  const target = garmentTarget(product.id);
  if (!target) return null;
  if (!product.details?.sizeGuide && !product.details?.sizeChart?.length) return target;
  const active = resolveSizeGuide(product);
  const generated = developmentSizeGuide(product.id);
  return active?.status === 'reference' && generated && JSON.stringify(sizeGuideSchema.parse(active)) === JSON.stringify(sizeGuideSchema.parse(generated)) ? target : null;
}
