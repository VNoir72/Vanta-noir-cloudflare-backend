import {z} from "zod";
import {storeSizeSchema} from "./sizing";
import {productDetailsSchema} from "./product-details";
const PRODUCT_STATUSES=["draft","published","archived"] as const;
const imageSchema = z.object({
  id: z.string().trim().max(160).optional(),
  color: z.string().trim().max(100).optional().default(""),
  imageUrl: z.string().trim().min(1).max(1200),
  imageAlt: z.string().trim().max(240).default(""),
});

const variantSchema = z.object({
  id: z.string().trim().max(160).optional(),
  sku: z.string().trim().min(1).max(100),
  size: storeSizeSchema,
  color: z.string().trim().min(1).max(100),
  colorHex: z.string().trim().regex(/^#[0-9a-f]{6}$/i),
  stock: z.number().int().min(0).max(100_000),
});

export const productSchema = z.object({
  id: z.string().trim().min(1).max(160).optional(),
  slug: z.string().trim().max(120).optional(),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(1).max(4000),
  details: productDetailsSchema.default({}),
  category: z.string().trim().min(1).max(120),
  priceKobo: z.number().int().min(100).max(100_000_000_000),
  featured: z.boolean().default(false),
  status: z.enum(PRODUCT_STATUSES).default("draft"),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  images: z.array(imageSchema).min(1).max(40),
  variants: z.array(variantSchema).min(1).max(100),
});

