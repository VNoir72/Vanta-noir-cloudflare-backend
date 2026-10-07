// Lightweight shared catalogue types and formatting; no build-time product snapshots.
import type { ProductDetails } from "./product-details";
import { STORE_SIZES } from "./sizing";
export { STORE_SIZES } from "./sizing";

export type CatalogImage = { imageUrl: string; imageAlt: string; color: string };

export type StoreSize = (typeof STORE_SIZES)[number];

export const STORE_COLORWAYS = [
  "Jet Black",
  "Dark Burgundy",
  "Charcoal Grey",
  "Deep Olive/Black",
] as const;

export type StoreColorway = (typeof STORE_COLORWAYS)[number];

export type CatalogColorway = {
  name: string;
  slug: string;
  hex: string;
  imageUrl: string;
  imageAlt: string;
  stock: Record<string, number>;
  variantIds?: Record<string, string>;
  sourceProductId?: string;
  sourceSlug?: string;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  priceKobo: number;
  imageUrl: string;
  imageAlt: string;
  color: string;
  colorways: CatalogColorway[];
  featured?: boolean;
  details?: ProductDetails;
  images?: CatalogImage[];
  createdAt?: string;
  updatedAt?: string;
};

export type CatalogSeed = CatalogProduct;

export function colorSlug(color: string) {
  return color
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function variantId(productId: string, size: string, color = "Jet Black") {
  return `${productId}-${colorSlug(color)}-${size.toLowerCase()}`;
}

export function formatNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}
