import { z } from "zod";
import { sizeGuideSchema } from "./sizing";

const short = z.string().trim().max(240).default("");
const measurement = z.number().positive().max(400).nullable().optional();
export const productDetailsSchema = z.object({
  audience: z.enum(["unisex", "men", "women"]).default("unisex"),
  collection: short,
  garmentType: short,
  fit: short,
  fabric: z.string().trim().max(1500).default(""),
  fabricWeight: short,
  features: z.string().trim().max(2000).default(""),
  care: z.string().trim().max(1500).default(""),
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
  sizeNotes: z.string().trim().max(1500).default(""),
  sizeGuide: sizeGuideSchema.nullable().default(null),
  sizeChart: z.array(z.object({
    size: z.string().trim().min(1).max(40), chest: measurement, waist: measurement,
    hip: measurement, inseam: measurement, length: measurement,
  })).max(30).default([]),
});
export type ProductDetails = z.infer<typeof productDetailsSchema>;
export function productDetails(value?: unknown): ProductDetails {
  try { return productDetailsSchema.parse(typeof value === "string" ? JSON.parse(value) : value ?? {}); }
  catch { return productDetailsSchema.parse({}); }
}
