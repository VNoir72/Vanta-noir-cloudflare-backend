import {collectionName,catalogueWording} from "./product-names";
import { z } from "zod";
import { sizeGuideSchema } from "./sizing";

const short = z.string().trim().max(240).default("");
const measurement = z.number().positive().max(400).nullable().optional();
export const productDetailsSchema = z.object({
  stitching: z.string().trim().max(12000).default(""),
  threadSpec: z.string().trim().max(12000).default(""),
  seamAllowances: z.string().trim().max(12000).default(""),
  reinforcement: z.string().trim().max(12000).default(""),
  trims: z.string().trim().max(12000).default(""),
  hardware: z.string().trim().max(12000).default(""),
  labels: z.string().trim().max(12000).default(""),
  artworkLock: z.string().trim().max(12000).default(""),
  techPackConstructionRevision: z.string().trim().max(500).default(""),
  audience: z.enum(["unisex", "men", "women"]).default("unisex"),
  collection: short,
  releaseDate: z.union([z.literal(''),z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;},'Enter a valid release date')]).default(''),
  garmentType: short,
  fit: short,
  fabric: z.string().trim().max(12000).default(""),
  fabricWeight: short,
  features: z.string().trim().max(12000).default(""),
  care: z.string().trim().max(12000).default(""),
  modelSizing: short,
  contents: short,
  availability: z.enum(["in_stock", "preorder", "preview"]).default("in_stock"),
  suggestedPriceNgn: z.number().int().nonnegative().optional(),
  priceStatus: z.enum(["approved", "proposed"]).default("approved"),
  dispatchNote: short,
  shippingWeightGrams: z.number().int().min(0).max(100000).default(0),
  seoTitle: z.string().trim().max(100).default(""),
  seoDescription: z.string().trim().max(200).default(""),
  measurementType: z.enum(["body", "garment"]).default("garment"),
  sizeNotes: z.string().trim().max(12000).default(""),
  sizeGuide: sizeGuideSchema.nullable().default(null),
  sizeChart: z.array(z.object({
    size: z.string().trim().min(1).max(40), chest: measurement, waist: measurement,
    hip: measurement, inseam: measurement, length: measurement,
  })).max(30).default([]),
});
export type ProductDetails = z.infer<typeof productDetailsSchema>;
export function productDetails(value?: unknown, normalizeWording = true): ProductDetails {
  try { const details=productDetailsSchema.parse(typeof value === "string" ? JSON.parse(value) : value ?? {}); return normalizeWording?{...details,collection:collectionName(details.collection),seoTitle:catalogueWording(details.seoTitle)}:details; }
  catch {
    let raw: Record<string,unknown> = {};
    try { const parsed = typeof value === "string" ? JSON.parse(value) : value; if(parsed && typeof parsed === "object" && !Array.isArray(parsed)) raw=parsed as Record<string,unknown>; } catch {}
    const valid: Record<string,unknown> = {};
    for(const [key,schema] of Object.entries(productDetailsSchema.shape)) { const result=schema.safeParse(raw[key]); if(result.success) valid[key]=result.data; }
    const details=productDetailsSchema.parse(valid);
    return normalizeWording?{...details,collection:collectionName(details.collection),seoTitle:catalogueWording(details.seoTitle)}:details;
  }
}

