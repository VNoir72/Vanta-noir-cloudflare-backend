import {expireUnpaidOrders} from './order-expiry';
import {assertCurrentShippingProfiles} from './shipping-checkout';
import {assertShippingProvider} from './shipping-policy';
import type {resolveShippingSelection} from './shipping-checkout';
import {detailsForSave, publicPricing} from "./publication-policy.mjs";
import { confirmedPaymentFee } from "./payment-amount";
import {garmentName,catalogueWording} from "./product-names";
import {quoteRewards,rewardCapacitySql} from './rewards-db';
import { receiptDigest } from "./receipt-access";
import { addressLineWithPostalCode } from "./checkout-address";
import { shippingCountryName } from "./shipping-countries";
import {quotePromotion} from "./operations";
import {
  CATALOG_SEED,
  STORE_SIZES,
  colorSlug,
  variantId,
  type CatalogColorway,
  type CatalogProduct,
} from "@/lib/catalog";
import { queueOrderEmail } from "./commerce-db";
import { productDetails, productDetailsSchema, type ProductDetails } from "./product-details";
import { storeSizeSchema } from "./sizing";
import { getDbBinding } from "@/lib/runtime-env";
import { importSeason01Catalogue } from "./season01-catalogue";
import { importVdCompletionCatalogue } from "./vd-completion-catalogue";
import { individualProductViews } from './catalog-images';

export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export type ProductImageInput = {
  id?: string;
  color?: string;
  imageUrl: string;
  imageAlt: string;
};

export type ProductVariantInput = {
  expectedStock?: number;
  id?: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
};

export type ProductInput = {
  id?: string;
  slug?: string;
  name: string;
  description: string;
  details?: ProductDetails;
  category: string;
  priceKobo: number;
  featured: boolean;
  status: ProductStatus;
  sortOrder?: number;
  images: ProductImageInput[];
  variants: ProductVariantInput[];
};

export type AdminProductImage = {
  id: string;
  color: string;
  imageUrl: string;
  imageAlt: string;
  sortOrder: number;
};

export type AdminProductVariant = {
  expectedStock?: number;
  id: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
  active: boolean;
};

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  details?: ProductDetails;
  category: string;
  priceKobo: number;
  imageUrl: string;
  imageAlt: string;
  status: ProductStatus;
  featured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  images: AdminProductImage[];
  variants: AdminProductVariant[];
};

export type CartRequestItem = { variantId: string; quantity: number };

export type CheckoutCustomer = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  countryCode?: string;
  postalCode?: string;
  city: string;
  state: string;
};

type ResolvedItem = {
  isGift?: boolean;
  variantId: string;
  productId: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPriceKobo: number;
  lineTotalKobo: number;
};

const LEGACY_PRODUCT_IDS = [
  "vn-shadow-track",
  "vn-void-shell",
  "vn-afterdark-hood",
  "vn-nocturne-run",
] as const;

const COLOR_HEX_FALLBACKS: Record<string, string> = {
  "jet black": "#101112",
  "vanta black": "#101112",
  "dark burgundy": "#4a101b",
  "charcoal grey": "#45484e",
  "deep olive/black": "#3c402e",
  "obsidian": "#101112",
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  priceKobo: number;
  imageUrl: string;
  imageAlt: string;
  active: number;
  detailsJson: string;
  status: string;
  featured: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type VariantRow = {
  id: string;
  productId: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
  active: number;
};

type ImageRow = {
  id: string;
  productId: string;
  color: string;
  imageUrl: string;
  imageAlt: string;
  sortOrder: number;
};

let catalogSeedPromise: Promise<void> | undefined;

function normalizedProductStatus(value: string): ProductStatus {
  return PRODUCT_STATUSES.includes(value as ProductStatus)
    ? (value as ProductStatus)
    : "draft";
}

function fallbackColorHex(color: string) {
  return COLOR_HEX_FALLBACKS[color.trim().toLowerCase()] ?? "#101112";
}

export async function ensureCatalogSeeded() {
  if (!catalogSeedPromise) catalogSeedPromise = seedCatalogOnce().then(addXxlVariantsOnce).then(importSeason01Catalogue).then(importVdCompletionCatalogue).catch(error => {
    catalogSeedPromise = undefined;
    throw error;
  });
  return catalogSeedPromise;
}

async function addXxlVariantsOnce() {
  const db = getDbBinding();
  const marker = "xxl_variants_added_v1";
  if (await db.prepare("SELECT value FROM store_meta WHERE key = ?").bind(marker).first()) return;
  const colors = await db.prepare(`SELECT v.product_id AS productId, v.color, MAX(v.color_hex) AS colorHex
    FROM product_variants v JOIN products p ON p.id = v.product_id
    WHERE p.active = 1 AND v.active = 1 AND p.id IN (${CATALOG_SEED.map(() => "?").join(", ")})
    GROUP BY v.product_id, v.color`).bind(...CATALOG_SEED.map(product => product.id)).all<{ productId: string; color: string; colorHex: string }>();
  const statements = colors.results.map(({ productId, color, colorHex }) => db.prepare(
    `INSERT OR IGNORE INTO product_variants (id, product_id, sku, size, color, color_hex, stock, active)
     SELECT ?, ?, ?, 'XXL', ?, ?, 0, 1
     WHERE NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = ? AND color = ? AND size IN ('XXL', '2XL'))
     AND NOT EXISTS (SELECT 1 FROM store_meta WHERE key = ?)`
  ).bind(variantId(productId, "XXL", color), productId, `VN-${productId.replace("vn-", "").toUpperCase()}-${colorSlug(color).toUpperCase()}-XXL`, color, colorHex, productId, color, marker));
  statements.push(db.prepare("INSERT OR IGNORE INTO store_meta (key, value) VALUES (?, '1')").bind(marker));
  await db.batch(statements);
}

async function seedCatalogOnce() {
  const db = getDbBinding();
  if (await db.prepare("SELECT value FROM store_meta WHERE key = 'catalog_seeded'").first()) return;
  const statements = [];

  for (const product of CATALOG_SEED) {
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO products
            (id, slug, name, category, description, price_kobo, image_url, image_alt,
             active, status, featured, sort_order)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?, 1, 'published', 0, 0 WHERE NOT EXISTS (SELECT 1 FROM store_meta WHERE key = 'catalog_seeded')`,
        )
        .bind(
          product.id,
          product.slug,
          product.name,
          product.category,
          product.description,
          product.priceKobo,
          product.imageUrl,
          product.imageAlt,
        ),
    );

    for (const colorway of product.colorways) {
      for (const size of STORE_SIZES) {
        statements.push(
          db
            .prepare(
              `INSERT OR IGNORE INTO product_variants
                (id, product_id, sku, size, color, color_hex, stock, active)
               SELECT ?, ?, ?, ?, ?, ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM store_meta WHERE key = 'catalog_seeded')`,
            )
            .bind(
              variantId(product.id, size, colorway.name),
              product.id,
              `VN-${product.id.replace("vn-", "").toUpperCase()}-${colorway.slug.toUpperCase()}-${size}`,
              size,
              colorway.name,
              colorway.hex,
              0,
            ),
        );
      }

      statements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO product_images
              (id, product_id, color, image_url, image_alt, sort_order)
             SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM store_meta WHERE key = 'catalog_seeded')`,
          )
          .bind(
            `seed-image-${product.id}-${colorway.slug}`,
            product.id,
            colorway.name,
            colorway.imageUrl,
            colorway.imageAlt,
            colorway.name === product.color ? 0 : 1,
          ),
      );
    }
  }

  statements.push(
    db
      .prepare(
        `UPDATE products SET active = 0, status = 'archived', updated_at = CURRENT_TIMESTAMP
         WHERE id IN (?, ?, ?, ?) AND NOT EXISTS (SELECT 1 FROM store_meta WHERE key = 'catalog_seeded')`,
      )
      .bind(...LEGACY_PRODUCT_IDS),
  );

  statements.push(db.prepare("INSERT OR IGNORE INTO store_meta (key, value) VALUES ('catalog_seeded', '1')"));
  await db.batch(statements);
}

export async function listCatalog() {
  await ensureCatalogSeeded();
  const db = getDbBinding();
  const [productRows, variantRows, imageRows] = await Promise.all([
    db
      .prepare(
        `SELECT id, slug, name, category, description,
                price_kobo AS priceKobo, image_url AS imageUrl,
                image_alt AS imageAlt, details_json AS detailsJson, active, status,
                featured, sort_order AS sortOrder,
                created_at AS createdAt, updated_at AS updatedAt
         FROM products
         WHERE active = 1 AND status = 'published'
         ORDER BY featured DESC, sort_order ASC, created_at ASC, id ASC`,
      )
      .all<ProductRow>(),
    db
      .prepare(
        `SELECT v.id, v.product_id AS productId, v.sku, v.size, v.color,
                v.color_hex AS colorHex,
                MAX(0, v.stock - COALESCE((SELECT SUM(r.quantity) FROM stock_reservations r WHERE r.variant_id = v.id AND r.expires_at > CURRENT_TIMESTAMP), 0)) AS stock,
                v.active
         FROM product_variants v
         JOIN products p ON p.id = v.product_id
         WHERE p.active = 1 AND p.status = 'published' AND v.active = 1
         ORDER BY v.product_id, v.color, v.size, v.id`,
      )
      .all<VariantRow>(),
    db
      .prepare(
        `SELECT i.id, i.product_id AS productId, i.color,
                i.image_url AS imageUrl, i.image_alt AS imageAlt,
                i.sort_order AS sortOrder
         FROM product_images i
         JOIN products p ON p.id = i.product_id
         WHERE p.active = 1 AND p.status = 'published'
         ORDER BY i.product_id, i.sort_order ASC, i.id ASC`,
      )
      .all<ImageRow>(),
  ]);

  const variantsByProduct = new Map<string, VariantRow[]>();
  for (const row of variantRows.results) {
    const current = variantsByProduct.get(row.productId) ?? [];
    current.push(row);
    variantsByProduct.set(row.productId, current);
  }
  const imagesByProduct = new Map<string, ImageRow[]>();
  for (const row of imageRows.results) {
    const current = imagesByProduct.get(row.productId) ?? [];
    current.push(row);
    imagesByProduct.set(row.productId, current);
  }

  return productRows.results
    .map((product) => {
      const colorways = buildCatalogColorways(
        product,
        variantsByProduct.get(product.id) ?? [],
        imagesByProduct.get(product.id) ?? [],
      );
      return {
        id: product.id,
        slug: product.slug,
        name: garmentName(product.name),
        category: product.category,
        description: product.description,
        ...publicPricing(product.priceKobo, productDetails(product.detailsJson)),
        imageUrl: product.imageUrl,
        imageAlt: catalogueWording(product.imageAlt),
        color: colorways[0]?.name ?? "Default",
        colorways,
        images: (imagesByProduct.get(product.id) ?? []).map(image => ({ imageUrl: image.imageUrl, imageAlt: catalogueWording(image.imageAlt), color: image.color })),
        createdAt: product.createdAt, updatedAt: product.updatedAt,
        featured: Boolean(product.featured),
      } satisfies CatalogProduct;
    })
    .filter((product) => product.colorways.length > 0).map(individualProductViews);
}

function buildCatalogColorways(
  product: ProductRow,
  variants: VariantRow[],
  images: ImageRow[],
): CatalogColorway[] {
  const colors = [...new Set(variants.map((variant) => variant.color))].sort((a, b) => {
    const aImage = images.find((entry) => entry.color.trim().toLowerCase() === a.trim().toLowerCase());
    const bImage = images.find((entry) => entry.color.trim().toLowerCase() === b.trim().toLowerCase());
    return (aImage?.sortOrder ?? Number.MAX_SAFE_INTEGER) - (bImage?.sortOrder ?? Number.MAX_SAFE_INTEGER);
  });
  return colors.map((color) => {
    const colorVariants = variants.filter((variant) => variant.color === color);
    const image =
      images.find((entry) => entry.color.trim().toLowerCase() === color.trim().toLowerCase()) ??
      images.find((entry) => !entry.color.trim()) ??
      images[0];
    const stock = Object.fromEntries(
      colorVariants.map((variant) => [variant.size, Number(variant.stock)]),
    );
    const fallback = fallbackColorHex(color);
    const storedColorHex = colorVariants.find((variant) => variant.colorHex)?.colorHex;
    return {
      name: color,
      slug: colorSlug(color),
      hex:
        storedColorHex && (storedColorHex.toLowerCase() !== "#101112" || fallback === "#101112")
          ? storedColorHex
          : fallback,
      imageUrl: image?.imageUrl ?? product.imageUrl,
      imageAlt: image?.imageAlt ?? product.imageAlt,
      stock,
      variantIds: Object.fromEntries(colorVariants.map(variant => [variant.size, variant.id])),
    };
  });
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  await ensureCatalogSeeded();
  const db = getDbBinding();
  const [productRows, variantRows, imageRows] = await Promise.all([
    db
      .prepare(
        `SELECT id, slug, name, category, description,
                price_kobo AS priceKobo, image_url AS imageUrl,
                image_alt AS imageAlt, details_json AS detailsJson, active, status,
                featured, sort_order AS sortOrder,
                created_at AS createdAt, updated_at AS updatedAt
         FROM products
         ORDER BY sort_order ASC, created_at ASC, id ASC`,
      )
      .all<ProductRow>(),
    db
      .prepare(
        `SELECT id, product_id AS productId, sku, size, color,
                color_hex AS colorHex, stock, active
         FROM product_variants
         ORDER BY product_id, active DESC, color, size, id`,
      )
      .all<VariantRow>(),
    db
      .prepare(
        `SELECT id, product_id AS productId, color,
                image_url AS imageUrl, image_alt AS imageAlt,
                sort_order AS sortOrder
         FROM product_images
         ORDER BY product_id, sort_order ASC, id ASC`,
      )
      .all<ImageRow>(),
  ]);

  const variantsByProduct = new Map<string, VariantRow[]>();
  for (const row of variantRows.results) {
    const current = variantsByProduct.get(row.productId) ?? [];
    current.push(row);
    variantsByProduct.set(row.productId, current);
  }
  const imagesByProduct = new Map<string, ImageRow[]>();
  for (const row of imageRows.results) {
    const current = imagesByProduct.get(row.productId) ?? [];
    current.push(row);
    imagesByProduct.set(row.productId, current);
  }

  return productRows.results.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: garmentName(product.name),
    category: product.category,
    description: product.description,
    priceKobo: Number(product.priceKobo),
    details: productDetails(product.detailsJson),
    imageUrl: product.imageUrl,
    imageAlt: catalogueWording(product.imageAlt),
    status: normalizedProductStatus(product.status),
    featured: Boolean(product.featured),
    sortOrder: Number(product.sortOrder ?? 0),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    images: (imagesByProduct.get(product.id) ?? []).map((image) => ({
      id: image.id,
      color: image.color,
      imageUrl: image.imageUrl,
      imageAlt: catalogueWording(image.imageAlt),
      sortOrder: Number(image.sortOrder ?? 0),
    })),
    variants: (variantsByProduct.get(product.id) ?? []).map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      colorHex: variant.colorHex || fallbackColorHex(variant.color),
      stock: Number(variant.stock),
      expectedStock: Number(variant.stock),
      active: Boolean(variant.active),
    })),
  }));
}

export async function getAdminProduct(productId: string) {
  return (await listAdminProducts()).find((product) => product.id === productId) ?? null;
}

function productSlug(value: string) {
  return colorSlug(value) || `product-${crypto.randomUUID().slice(0, 8)}`;
}

function validImageSource(value: string) {
  if (/^\/(?![\/\\])/.test(value)) return !value.includes("\\");
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export async function saveAdminProduct(input: ProductInput, actor = "administrator"): Promise<AdminProduct> {
  await ensureCatalogSeeded();
  const db = getDbBinding();
  const productId = input.id?.trim() || crypto.randomUUID();
  const existingProduct = input.id
    ? await db.prepare("SELECT id, status, details_json AS detailsJson FROM products WHERE id = ? LIMIT 1").bind(productId).first<{ id: string; status: string; detailsJson: string }>()
    : null;

  if (input.id && !existingProduct) throw new Error("Product not found.");

  const detailsJson = JSON.stringify(detailsForSave(existingProduct ? {...existingProduct, details: productDetails(existingProduct.detailsJson)} : null, input.status, productDetailsSchema.parse(input.details ?? {})));
  const name = input.name.trim();
  const category = input.category.trim();
  const description = input.description.trim();
  const slug = productSlug(input.slug?.trim() || name);
  if (name.length < 2 || name.length > 160) throw new Error("Product name must be 2–160 characters.");
  if (!category || category.length > 120) throw new Error("A valid product category is required.");
  if (!description || description.length > 4000) throw new Error("A valid product description is required.");
  if (!Number.isSafeInteger(input.priceKobo) || input.priceKobo < 100 || input.priceKobo > 100_000_000_000) {
    throw new Error("Product price is invalid.");
  }
  if (!PRODUCT_STATUSES.includes(input.status)) throw new Error("Product status is invalid.");
  if (!input.images.length || input.images.length > 40) throw new Error("Add between 1 and 40 product images.");
  if (!input.variants.length || input.variants.length > 100) throw new Error("Add between 1 and 100 product variations.");

  const images = input.images.map((image) => {
    const imageUrl = image.imageUrl.trim();
    const imageAlt = image.imageAlt.trim() || `${name} product image`;
    const color = image.color?.trim() ?? "";
    if (!validImageSource(imageUrl) || imageUrl.length > 1200) throw new Error("Every image must use a valid site path or http(s) URL.");
    if (imageAlt.length > 240 || color.length > 100) throw new Error("Image details are too long.");
    return { imageUrl, imageAlt, color };
  });

  const variants = input.variants.map((variant) => {
    const parsedSize = storeSizeSchema.safeParse(variant.size);
    if (!parsedSize.success) throw new Error("Enter a valid size of up to 40 characters, such as XS, 3XL, EU 42 or One size.");
    const size = parsedSize.data;
    const color = variant.color.trim();
    const sku = variant.sku.trim().toUpperCase();
    const colorHex = variant.colorHex.trim();
    if (!size || size.length > 40 || !color || color.length > 100 || !sku || sku.length > 100) {
      throw new Error("Every variation needs a size, colour/design, and SKU.");
    }
    if (!/^#[0-9a-f]{6}$/i.test(colorHex)) throw new Error("Variation swatches must use a six-digit hex colour.");
    if (!Number.isSafeInteger(variant.stock) || variant.stock < 0 || variant.stock > 100_000) {
      throw new Error("Variation stock must be a whole number from 0 to 100,000.");
    }
    return {
      id: variant.id?.trim() || variantId(productId, size, color),
      sku,
      size,
      color,
      colorHex,
      stock: variant.stock,
      expectedStock: variant.expectedStock,
    };
  });

  const variationKeys = new Set<string>();
  const skus = new Set<string>();
  for (const variant of variants) {
    const variationKey = `${variant.color.toLowerCase()}::${variant.size.toLowerCase()}`;
    if (variants.filter(item => item.id === variant.id).length > 1) throw new Error("Variation IDs must be unique.");
    if (variationKeys.has(variationKey)) throw new Error("Each colour/design and size combination must be unique.");
    variationKeys.add(variationKey);
    if (skus.has(variant.sku)) throw new Error("Every variation SKU must be unique.");
    skus.add(variant.sku);
  }

  const slugConflict = await db
    .prepare("SELECT id FROM products WHERE slug = ? AND id <> ? LIMIT 1")
    .bind(slug, productId)
    .first<{ id: string }>();
  if (slugConflict) throw new Error("That product slug is already in use.");

  const incomingIds = variants.map((variant) => variant.id);
  const incomingPlaceholders = incomingIds.map(() => "?").join(", ");
  const [idConflicts, skuConflicts] = await Promise.all([
    db
      .prepare(`SELECT id, product_id AS productId FROM product_variants WHERE id IN (${incomingPlaceholders})`)
      .bind(...incomingIds)
      .all<{ id: string; productId: string }>(),
    db
      .prepare(`SELECT id, sku FROM product_variants WHERE sku IN (${skus.size ? [...skus].map(() => "?").join(", ") : "''"})`)
      .bind(...skus)
      .all<{ id: string; sku: string }>(),
  ]);

  for (const row of idConflicts.results) {
    if (row.productId !== productId) throw new Error("A variation belongs to another product.");
  }
  const incomingIdSet = new Set(incomingIds);
  for (const row of skuConflicts.results) {
    if (!incomingIdSet.has(row.id)) throw new Error(`SKU ${row.sku} is already in use.`);
  }

  const existingVariants = existingProduct
    ? await db
        .prepare("SELECT id FROM product_variants WHERE product_id = ?")
        .bind(productId)
        .all<{ id: string }>()
    : { results: [] as Array<{ id: string }> };
  const referencedVariantRows = existingProduct
    ? await db
        .prepare("SELECT DISTINCT variant_id AS id FROM order_items WHERE product_id = ?")
        .bind(productId)
        .all<{ id: string }>()
    : { results: [] as Array<{ id: string }> };
  const referencedVariantIds = new Set(referencedVariantRows.results.map((variant) => variant.id));

  const active = input.status === "published" ? 1 : 0;
  const productStatement = existingProduct
    ? db
        .prepare(
          `UPDATE products
           SET slug = ?, name = ?, category = ?, description = ?, price_kobo = ?,
               image_url = ?, image_alt = ?, active = ?, status = ?, featured = ?,
               sort_order = ?, details_json = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        )
        .bind(
          slug,
          name,
          category,
          description,
          input.priceKobo,
          images[0].imageUrl,
          images[0].imageAlt,
          active,
          input.status,
          input.featured ? 1 : 0,
          input.sortOrder ?? 0,
          detailsJson,
          productId,
        )
    : db
        .prepare(
          `INSERT INTO products
            (id, slug, name, category, description, price_kobo, image_url, image_alt,
             active, status, featured, sort_order, details_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          productId,
          slug,
          name,
          category,
          description,
          input.priceKobo,
          images[0].imageUrl,
          images[0].imageAlt,
          active,
          input.status,
          input.featured ? 1 : 0,
          input.sortOrder ?? 0,
          detailsJson,
        );

  const imageStatements = [
    ...(existingProduct ? [db.prepare("DELETE FROM product_images WHERE product_id = ?").bind(productId)] : []),
    ...images.map((image, index) =>
      db
        .prepare(
          `INSERT INTO product_images
            (id, product_id, color, image_url, image_alt, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(crypto.randomUUID(), productId, image.color, image.imageUrl, image.imageAlt, index),
    ),
  ];
  const variantStatements = variants.map((variant) =>
      db
        .prepare(
          `INSERT INTO product_variants
            (id, product_id, sku, size, color, color_hex, stock, active)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)
           ON CONFLICT(id) DO UPDATE SET
             product_id = excluded.product_id,
             sku = excluded.sku,
             size = excluded.size,
             color = excluded.color,
             color_hex = excluded.color_hex,
             stock = CASE WHEN (? IS NOT NULL AND product_variants.stock <> ?)
               OR excluded.stock < COALESCE((SELECT SUM(quantity) FROM stock_reservations WHERE variant_id=product_variants.id AND expires_at>CURRENT_TIMESTAMP),0)
               THEN NULL ELSE excluded.stock END,
             active = 1,
             updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(
          variant.id,
          productId,
          variant.sku,
          variant.size,
          variant.color,
          variant.colorHex,
          variant.stock,
          variant.expectedStock ?? null,
          variant.expectedStock ?? null,
        ),
    );

  const removedVariants = existingVariants.results.filter((variant) => !incomingIdSet.has(variant.id));
  const removalStatements = removedVariants.map(variant =>
    referencedVariantIds.has(variant.id)
      ? db.prepare("UPDATE product_variants SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(variant.id)
      : db.prepare("DELETE FROM product_variants WHERE id = ?").bind(variant.id),
  );
  const auditStatements = variants.map(v => db.prepare("INSERT INTO stock_adjustments (variant_id,old_stock,new_stock,reason,actor) SELECT id,stock,?,'Product editor',? FROM product_variants WHERE id=? AND stock<>?").bind(v.stock,actor,v.id,v.stock));
  // A NOT NULL violation in the conditional stock assignment aborts the entire
  // D1 batch, including metadata/images. A sale must never be overwritten by
  // inventory from a product editor opened before that sale.
  try {
    await db.batch([productStatement, ...imageStatements, ...auditStatements, ...variantStatements, ...removalStatements]);
  } catch (error) {
    if (String(error).includes('product_variants.stock')) throw new Error('Stock changed or is reserved for checkout. Reopen the product and review current stock before saving.');
    throw error;
  }

  const saved = await getAdminProduct(productId);
  if (!saved) throw new Error("Product could not be saved.");
  return saved;
}

export async function setAdminProductStatus(productId: string, status: ProductStatus) {
  await ensureCatalogSeeded();
  if (!PRODUCT_STATUSES.includes(status)) throw new Error("Product status is invalid.");
  const active = status === "published" ? 1 : 0;
  const result = await getDbBinding()
    .prepare(
      `UPDATE products SET details_json = CASE WHEN ? = 'published' AND status = 'published' THEN details_json ELSE json_set(CASE WHEN json_valid(details_json) THEN details_json ELSE '{}' END, '$.availability', 'preview', '$.priceStatus', 'proposed') END, status = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    )
    .bind(status, status, active, productId)
    .run();
  if (!result.meta.changes) throw new Error("Product not found.");
  const saved = await getAdminProduct(productId);
  if (!saved) throw new Error("Product could not be loaded.");
  return saved;
}

export async function deleteAdminProduct(productId: string) {
  await ensureCatalogSeeded();
  const db = getDbBinding();
  const existing = await db
    .prepare("SELECT id FROM products WHERE id = ? LIMIT 1")
    .bind(productId)
    .first<{ id: string }>();
  if (!existing) throw new Error("Product not found.");

  const linkedOrder = await db
    .prepare("SELECT 1 AS found FROM order_items WHERE product_id = ? LIMIT 1")
    .bind(productId)
    .first<{ found: number }>();
  if (linkedOrder) {
    throw new Error("This design is linked to an order and cannot be permanently deleted. Archive it instead.");
  }

  await db.batch([
    db.prepare("DELETE FROM product_images WHERE product_id = ?").bind(productId),
    db.prepare("DELETE FROM product_variants WHERE product_id = ?").bind(productId),
    db.prepare("DELETE FROM products WHERE id = ?").bind(productId),
  ]);
}

export async function createPendingOrder(args: {
  shippingQuote?: Awaited<ReturnType<typeof resolveShippingSelection>>;
  checkoutAttempt?: string;
  customer: CheckoutCustomer;
  cart: CartRequestItem[];
  shippingKobo: number;
  expectedTotalKobo: number;
  deliveryEstimate?: string;
  promotionCode?: string;
  rewardCode?: string;
  expectedRewardSignature?: string;
}) {
  if(args.shippingQuote){assertShippingProvider(args.shippingQuote.rate.provider);if(args.shippingKobo!==args.shippingQuote.rate.amountKobo)throw Error('The delivery charge changed. Check delivery again.');}
  await ensureCatalogSeeded();
  const db = getDbBinding();
  const attempt=args.checkoutAttempt;
  if(attempt&&!/^[-a-f0-9]{73}$/.test(attempt))throw new Error('Invalid checkout attempt.');
  const attemptHash=attempt?await receiptDigest(attempt):'';
  const {checkoutAttempt:_attempt,...requestData}=args;
  const requestHash=attempt?await receiptDigest(JSON.stringify(requestData)):'';
  const reference = attempt ? `VN-${attemptHash.slice(0,32).toUpperCase()}` : `VN-${crypto.randomUUID().replaceAll("-", "").toUpperCase()}`;
  async function resume(){
    const saved=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind('checkout-request:'+reference).first<{value:string}>();
    if(!saved)return null;
    if(saved.value!==requestHash)throw new Error('Checkout details changed. Refresh checkout before paying.');
    const order=await getOrderByReference(reference);if(!order)return null;
    const totals=await db.prepare('SELECT subtotal_kobo AS subtotalKobo,shipping_kobo AS shippingKobo FROM orders WHERE id=?').bind(order.id).first<{subtotalKobo:number;shippingKobo:number}>();
    return {id:order.id,reference,receiptToken:attempt!,subtotalKobo:totals!.subtotalKobo,shippingKobo:totals!.shippingKobo,totalKobo:order.totalKobo};
  }
  if(attempt){const existing=await resume();if(existing)return existing;}
  if(args.shippingQuote)await assertCurrentShippingProfiles(args.shippingQuote.selection);
  const uniqueVariantIds = [...new Set(args.cart.map((item) => item.variantId))];
  if (!args.cart.length || args.cart.length > 20 || uniqueVariantIds.length !== args.cart.length
    || args.cart.some(item => !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 5)) throw new Error("Your bag is invalid. Please refresh it.");
  const placeholders = uniqueVariantIds.map(() => "?").join(", ");
  const variants = await db
    .prepare(
      `SELECT
         v.id AS variantId, v.product_id AS productId, v.size, v.color, v.stock,
         v.active AS variantActive, p.name AS productName,
         p.price_kobo AS unitPriceKobo, p.active, p.status, p.details_json AS detailsJson
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
       WHERE v.id IN (${placeholders})`,
    )
    .bind(...uniqueVariantIds)
    .all<{
      variantId: string;
      productId: string;
      size: string;
      color: string;
      stock: number;
      variantActive: number;
      productName: string;
      unitPriceKobo: number;
      detailsJson: string;
      active: number;
      status: string;
    }>();

  const byId = new Map(variants.results.map((variant) => [variant.variantId, variant]));
  const resolved: ResolvedItem[] = args.cart.map((item) => {
    const variant = byId.get(item.variantId);
    if (!variant || !variant.active || !variant.variantActive || variant.status !== "published" || productDetails(variant.detailsJson).availability === "preview" || productDetails(variant.detailsJson).priceStatus === "proposed") {
      throw new Error("One of the selected items is no longer available.");
    }
    if (variant.stock < item.quantity) {
      throw new Error(`${variant.productName} in size ${variant.size} has insufficient stock.`);
    }
    return {
      variantId: variant.variantId,
      productId: variant.productId,
      productName: variant.productName,
      size: variant.size,
      color: variant.color,
      quantity: item.quantity,
      unitPriceKobo: variant.unitPriceKobo,
      lineTotalKobo: variant.unitPriceKobo * item.quantity,
    };
  });

  const subtotalKobo = resolved.reduce((sum, item) => sum + item.lineTotalKobo, 0);
  const {discountKobo,promotion}=await quotePromotion(args.promotionCode||"",resolved);
  const reward = await quoteRewards({subtotalKobo,discountKobo,hasDiscount:Boolean(promotion),countryCode:args.customer.countryCode || 'NG',state:args.customer.state,email:args.customer.email,code:args.rewardCode,shippingKobo:args.shippingKobo,cart:args.cart});
  if (reward.quote.signature !== (args.expectedRewardSignature || '')) throw new Error('Your reward changed. Refresh checkout to review your gift and delivery before paying.');
  if(args.shippingQuote&&(args.shippingQuote.expiresAt<=Date.now()||args.shippingQuote.giftVariantId!==(reward.gift?.variantId||'')))throw new Error('Your reward or delivery quote changed. Check delivery again before paying.');
  const shippingKobo = reward.quote.shippingKobo!;
  const totalKobo = subtotalKobo + shippingKobo - discountKobo;
  const allocations = resolved.map(i=>({...i}));
  if (reward.gift) {
    const g=reward.gift, allocation=allocations.find(i=>i.variantId===g.variantId);
    if(allocation) allocation.quantity++; else allocations.push({...g,quantity:1,lineTotalKobo:g.unitPriceKobo});
    resolved.push({...g,productName:'Free gift · '+g.productName,quantity:1,unitPriceKobo:0,lineTotalKobo:0,isGift:true});
  }
  if (totalKobo !== args.expectedTotalKobo) throw new Error("The prices or delivery charge have changed. Please refresh your bag before paying.");
  const id = crypto.randomUUID();
  const receiptToken=attempt||`${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const receiptAccess=JSON.stringify({digest:await receiptDigest(receiptToken),expires:Date.now()+7*24*60*60*1000});

  const statements = [
    db
      .prepare(
        `INSERT INTO orders
          (id, reference, email, first_name, last_name, phone, address_line_1,
           address_line_2, city, state, country, subtotal_kobo, shipping_kobo, total_kobo, discount_kobo, promotion_code)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         WHERE (?='' OR EXISTS(SELECT 1 FROM promotions pr WHERE code=? AND version=? AND active=1 AND starts_at<=? AND ends_at>? AND (max_uses=0 OR max_uses>(SELECT COUNT(*) FROM orders o WHERE o.promotion_code=pr.code AND (o.payment_status='paid' OR (o.status='pending_payment' AND o.created_at>datetime('now','-15 minutes'))))))) AND (?='' OR EXISTS(SELECT 1 FROM reward_campaigns c WHERE c.id=? AND c.version=? AND c.active=1 AND c.starts_at<=? AND c.ends_at>? AND ${rewardCapacitySql})) AND NOT EXISTS (
           SELECT 1 FROM json_each(?) c
           LEFT JOIN product_variants v ON v.id = json_extract(c.value, '$.variantId')
           LEFT JOIN products p ON p.id = v.product_id
           WHERE v.id IS NULL OR v.active <> 1 OR p.active <> 1 OR p.status <> 'published'
             OR json_extract(p.details_json, '$.availability') = 'preview'
             OR json_extract(p.details_json, '$.priceStatus') = 'proposed'
             OR p.price_kobo <> json_extract(c.value, '$.unitPriceKobo')
             OR v.stock - COALESCE((SELECT SUM(r.quantity) FROM stock_reservations r WHERE r.variant_id = v.id AND r.expires_at > CURRENT_TIMESTAMP), 0) < json_extract(c.value, '$.quantity')
         )`,
      )
      .bind(
        id,
        reference,
        args.customer.email,
        args.customer.firstName,
        args.customer.lastName,
        args.customer.phone,
        args.customer.addressLine1,
        addressLineWithPostalCode(args.customer),
        args.customer.city,
        args.customer.state,
        shippingCountryName(args.customer.countryCode),
        subtotalKobo,
        shippingKobo,
        totalKobo, discountKobo, promotion?.code||"",
        promotion?.code||"",promotion?.code||"",promotion?.version||0,new Date().toISOString(),new Date().toISOString(),
        reward.campaign?.id||"",reward.campaign?.id||"",reward.campaign?.version||0,new Date().toISOString(),new Date().toISOString(),
        JSON.stringify(allocations),
      ),
    ...resolved.map((item) =>
      db
        .prepare(
          `INSERT INTO order_items
            (order_id, product_id, variant_id, product_name, size, color,
             quantity, unit_price_kobo, line_total_kobo, is_gift)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM orders WHERE id = ?)`,
        )
        .bind(
          id,
          item.productId,
          item.variantId,
          item.productName,
          item.size,
          item.color,
          item.quantity,
          item.unitPriceKobo,
          item.lineTotalKobo,
          item.isGift ? 1 : 0,
          id,
        ),
    ),
  ];

  if(args.shippingQuote)statements.push(db.prepare("INSERT INTO store_meta(key,value) SELECT ?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=?)").bind('order-shipping:'+reference,JSON.stringify({...args.shippingQuote,bookingStatus:'manual_confirmation_required'}),id));
  if(reward.campaign) statements.push(db.prepare("INSERT INTO order_rewards(order_id,campaign_id,title,shipping_savings_kobo,gift_variant_id,max_uses) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=?)").bind(id,reward.campaign.id,reward.campaign.title,reward.quote.shippingSavingsKobo,reward.gift?.variantId||'',reward.campaign.maxUses,id));
  statements.push(db.prepare("INSERT INTO store_meta(key,value) SELECT ?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=?)").bind(`receipt-access:${reference}`,receiptAccess,id));
  statements.push(...allocations.map(item => db.prepare(
    "INSERT INTO stock_reservations (id, order_id, variant_id, quantity, expires_at) SELECT ?, ?, ?, ?, datetime('now', '+15 minutes') WHERE EXISTS (SELECT 1 FROM orders WHERE id = ?)"
  ).bind(crypto.randomUUID(), id, item.variantId, item.quantity, id)));
  if(attempt) statements.push(db.prepare("INSERT INTO store_meta(key,value) SELECT ?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=?)").bind('checkout-request:'+reference,requestHash,id));
  let results;
  try{results=await db.batch(statements);}catch(error){if(attempt){const existing=await resume();if(existing)return existing;}
  if(args.shippingQuote)await assertCurrentShippingProfiles(args.shippingQuote.selection);throw error;}
  if (!results[0].meta.changes) throw new Error("An item was just reserved or changed. Please refresh your bag and try again.");
  if (args.deliveryEstimate) await db.prepare("UPDATE orders SET delivery_estimate=? WHERE id=?").bind(args.deliveryEstimate, id).run();
  return { id, reference, receiptToken, subtotalKobo, shippingKobo, totalKobo };
}

export async function markOrderPaymentError(reference: string) {
  const db = getDbBinding();
  await db.batch([
    db.prepare("UPDATE orders SET status = 'payment_error', updated_at = CURRENT_TIMESTAMP WHERE reference = ? AND payment_status = 'pending' AND status <> 'cancelled'").bind(reference),
    db.prepare("DELETE FROM stock_reservations WHERE order_id IN (SELECT id FROM orders WHERE reference = ? AND payment_status = 'pending')").bind(reference),
  ]);
}

export async function getOrderByReference(reference: string) {
  const db = getDbBinding();
  return db
    .prepare(
      `SELECT id, reference, email, total_kobo AS totalKobo,
              status, payment_status AS paymentStatus, created_at AS createdAt
       FROM orders WHERE reference = ? LIMIT 1`,
    )
    .bind(reference)
    .first<{
      id: string;
      reference: string;
      email: string;
      totalKobo: number;
      status: string;
      paymentStatus: string;
      createdAt: string;
    }>();
}

export async function getPublicPaymentOrder(reference: string) {
  await expireUnpaidOrders(reference);
  const db = getDbBinding();
  const order = await db.prepare(`SELECT id, reference, status, payment_status AS paymentStatus,
    (subtotal_kobo-discount_kobo) AS subtotalKobo, discount_kobo AS discountKobo, promotion_code AS promotionCode, shipping_kobo AS shippingKobo, total_kobo AS totalKobo
    FROM orders WHERE reference = ? LIMIT 1`).bind(reference).first<{
      id: string; reference: string; status: string; paymentStatus: string;
      subtotalKobo: number; shippingKobo: number; totalKobo: number;
    }>();
  if (!order) return null;
  const items = await db.prepare(`SELECT variant_id AS variantId, product_name AS productName,
    color, size, quantity, unit_price_kobo AS unitPriceKobo FROM order_items WHERE order_id = ?`).bind(order.id)
    .all<{ variantId: string; productName: string; color: string; size: string; quantity: number; unitPriceKobo: number }>();
  const { id: _id, ...publicOrder } = order;
  const paymentAmounts=await db.prepare("SELECT value FROM store_meta WHERE key=?").bind(`verified-payment-amounts:${reference}`).first<{value:string}>();
  const paymentFeeKobo=paymentAmounts ? Number(JSON.parse(paymentAmounts.value).paymentFeeKobo)||0 : 0;
  const diagnostic=await db.prepare("SELECT value FROM store_meta WHERE key=?").bind('payment-diagnostic:'+reference).first<{value:string}>();
  const providerStatus=diagnostic?JSON.parse(diagnostic.value).status:undefined;
  return { ...publicOrder, providerStatus, paymentFeeKobo, items: items.results };
}

export async function getGuestOrder(reference: string, email: string, phone: string) {
  await expireUnpaidOrders(reference);
  const db = getDbBinding();
  const order = await db
    .prepare(
      `SELECT id, reference, email, phone, total_kobo AS totalKobo,
              status, payment_status AS paymentStatus, created_at AS createdAt,
              updated_at AS updatedAt, carrier, tracking_number AS trackingNumber, tracking_url AS trackingUrl, delivery_estimate AS deliveryEstimate
       FROM orders WHERE reference = ? LIMIT 1`,
    )
    .bind(reference)
    .first<{
      id: string;
      reference: string;
      email: string;
      phone: string;
      totalKobo: number;
      status: string;
      paymentStatus: string;
      createdAt: string;
      updatedAt: string; carrier: string; trackingNumber: string; trackingUrl: string; deliveryEstimate: string;
    }>();

  if (!order) return null;
  const normalizedPhone = (value: string) => value.replace(/\D/g, "");
  const emailMatches = Boolean(email.trim()) && order.email.trim().toLowerCase() === email.trim().toLowerCase();
  const phoneMatches = Boolean(normalizedPhone(phone)) && normalizedPhone(order.phone) === normalizedPhone(phone);
  if (!emailMatches && !phoneMatches) return null;

  const items = await db
    .prepare(
      `SELECT id, product_id AS productId, product_name AS productName, size, color, quantity,
              unit_price_kobo AS unitPriceKobo, line_total_kobo AS lineTotalKobo
       FROM order_items WHERE order_id = ? ORDER BY id ASC`,
    )
    .bind(order.id)
    .all<{
      id: number; productId: string; productName: string;
      size: string;
      color: string;
      quantity: number;
      unitPriceKobo: number;
      lineTotalKobo: number;
    }>();

  const returnRequest = await db.prepare("SELECT r.id,r.kind,r.status,r.notes,r.refund_kobo AS refundKobo,r.refund_status AS refundStatus,r.created_at AS createdAt,e.status AS exchangeStatus,e.carrier AS exchangeCarrier,e.tracking_number AS exchangeTracking FROM return_requests r LEFT JOIN exchanges e ON e.return_id=r.id WHERE r.order_id=?").bind(order.id).first();
  return {
    carrier: order.carrier, trackingNumber: order.trackingNumber, trackingUrl: order.trackingUrl, deliveryEstimate: order.deliveryEstimate, returnRequest,
    reference: order.reference,
    totalKobo: order.totalKobo,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: items.results,
  };
}

export async function markOrderPaid(args: {
  reference: string;
  amountKobo: number;
  eventKey: string;
  eventType: string;
  paymentDomain?: 'test' | 'live';
  requestedAmountKobo?: number | string | null;
  providerFeesKobo?: number | null;
}) {
  const db = getDbBinding();
  await expireUnpaidOrders(args.reference);
  const order = await getOrderByReference(args.reference);
  if (!order) throw new Error("Order not found.");
  if (order.reference.startsWith("VN-WALK-")) throw new Error("Walk-in sales require owner review.");
  const paymentFeeKobo = confirmedPaymentFee(order.totalKobo,args.amountKobo,args.requestedAmountKobo,args.providerFeesKobo);
  if (order.paymentStatus === "paid") { await queueOrderEmail(args.reference,"payment"); return order; }

  const allocationToken = crypto.randomUUID();
  await db.batch([
    db.prepare(`UPDATE orders SET payment_status = 'paid', allocation_token = ?, paid_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP,
      status = CASE WHEN status IN ('cancelled','expired') OR EXISTS (
        SELECT 1 FROM promotions pr WHERE pr.code=orders.promotion_code AND pr.max_uses>0 AND pr.max_uses<=
          (SELECT COUNT(*) FROM orders paid WHERE paid.promotion_code=pr.code AND paid.id<>orders.id AND paid.payment_status='paid')
      ) OR EXISTS (
        SELECT 1 FROM order_rewards own WHERE own.order_id=orders.id AND own.max_uses>0 AND own.max_uses<=
          (SELECT COUNT(*) FROM order_rewards used JOIN orders paid ON paid.id=used.order_id WHERE used.campaign_id=own.campaign_id AND paid.id<>orders.id AND paid.payment_status='paid')
      ) OR EXISTS (
        SELECT 1 FROM order_items oi LEFT JOIN product_variants v ON v.id = oi.variant_id
        WHERE oi.order_id = orders.id AND (v.id IS NULL OR
          v.stock - COALESCE((SELECT SUM(r.quantity) FROM stock_reservations r WHERE r.variant_id = v.id AND r.order_id <> orders.id AND r.expires_at > CURRENT_TIMESTAMP), 0) < (SELECT SUM(quantity) FROM order_items needed WHERE needed.order_id=oi.order_id AND needed.variant_id=oi.variant_id))
      ) THEN 'paid_stock_review' ELSE 'paid' END
      WHERE id = ? AND payment_status <> 'paid'`).bind(allocationToken, order.id),
    db.prepare(`INSERT INTO stock_adjustments(variant_id,old_stock,new_stock,reason,actor) SELECT v.id,v.stock,v.stock-SUM(i.quantity),?,'payment' FROM order_items i JOIN product_variants v ON v.id=i.variant_id WHERE i.order_id=? AND EXISTS(SELECT 1 FROM orders WHERE id=? AND allocation_token=? AND status='paid') GROUP BY v.id`).bind(`Sale ${args.reference}`,order.id,order.id,allocationToken),
    db.prepare(`UPDATE product_variants SET stock = stock - (
        SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = ? AND oi.variant_id = product_variants.id
      ), updated_at = CURRENT_TIMESTAMP
      WHERE id IN (SELECT variant_id FROM order_items WHERE order_id = ?)
        AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND allocation_token = ? AND status = 'paid')`
    ).bind(order.id, order.id, order.id, allocationToken),
    db.prepare("DELETE FROM stock_reservations WHERE order_id = ?").bind(order.id),
    db.prepare("INSERT OR IGNORE INTO payment_events (event_key, reference, event_type) VALUES (?, ?, ?)").bind(args.eventKey, args.reference, args.eventType),
    db.prepare("INSERT OR IGNORE INTO store_meta (key,value) SELECT ?,? WHERE EXISTS (SELECT 1 FROM orders WHERE id=? AND allocation_token=?)")
      .bind(`verified-payment:${args.reference}`,args.paymentDomain==='live'?'live':args.paymentDomain==='test'?'test':'unknown',order.id,allocationToken),
    db.prepare("INSERT OR IGNORE INTO store_meta(key,value) SELECT ?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND allocation_token=?)")
      .bind(`verified-payment-amounts:${args.reference}`,JSON.stringify({orderTotalKobo:order.totalKobo,chargedTotalKobo:args.amountKobo,paymentFeeKobo}),order.id,allocationToken),
    db.prepare("UPDATE orders SET allocation_token = NULL WHERE id = ? AND allocation_token = ?").bind(order.id, allocationToken),
  ]);
  await queueOrderEmail(args.reference,"payment");
  return getOrderByReference(args.reference);
}

export type AdminOrder = {
  id: string; reference: string; email: string; firstName: string; lastName: string;
  phone: string; addressLine1: string; addressLine2: string; city: string; state: string; country: string;
  totalKobo: number; status: string; paymentStatus: string; providerStatus?: string; createdAt: string;
  carrier: string; trackingNumber: string; trackingUrl: string; deliveryEstimate: string;
  items: Array<{ productName: string; size: string; color: string; quantity: number }>;
};

export type OrderQuery = { page?: number; query?: string; customerEmail?:string; status?: string; from?: string; to?: string };
function orderQuery(options: OrderQuery) {
  const customerEmail=(options.customerEmail||'').trim().toLowerCase().slice(0,200);
  const query=(options.query ?? "").trim().slice(0,160), status=options.status ?? "", from=options.from ?? "", to=options.to ?? "";
  return { where: `(?='' OR lower(email)=?) AND (?='' OR reference LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR (first_name || ' ' || last_name) LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR tracking_number LIKE ? ESCAPE '\\') AND (?='' OR status=? OR (?='fulfil' AND payment_status='paid' AND status IN ('paid','processing'))) AND (?='' OR created_at>=?) AND (?='' OR created_at<date(?,'+1 day'))`, args:[customerEmail,customerEmail,query,...Array(5).fill(`%${query.replace(/[\\%_]/g,'\\$&')}%`),status,status,status,from,from,to,to] };
}
export async function countAdminOrders(options: OrderQuery = {}) {
  const {where,args}=orderQuery(options);
  const row=await getDbBinding().prepare(`SELECT COUNT(*) AS total FROM orders WHERE ${where}`).bind(...args).first<{total:number}>();
  return row?.total ?? 0;
}
export async function listAdminOrders(options: OrderQuery = {}): Promise<AdminOrder[]> {
  await ensureCatalogSeeded(); const db=getDbBinding(); const {where,args}=orderQuery(options);
  const page=Math.max(1,Math.min(10000,Math.floor(options.page ?? 1)));
  const rows=await db.prepare(`SELECT id,reference,email,first_name AS firstName,last_name AS lastName,total_kobo AS totalKobo,status,payment_status AS paymentStatus,
    phone,address_line_1 AS addressLine1,address_line_2 AS addressLine2,city,state,country,created_at AS createdAt,
    carrier,tracking_number AS trackingNumber,tracking_url AS trackingUrl,delivery_estimate AS deliveryEstimate,
    (SELECT json_extract(value,'$.status') FROM store_meta WHERE key='payment-diagnostic:'||orders.reference) AS providerStatus
    FROM orders WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET ?`).bind(...args,(page-1)*50).all<Omit<AdminOrder,"items">>();
  if(!rows.results.length)return [];
  const items=await db.prepare(`SELECT order_id AS orderId,product_name AS productName,size,color,quantity FROM order_items WHERE order_id IN (${rows.results.map(()=>"?").join(",")})`).bind(...rows.results.map(o=>o.id)).all<AdminOrder["items"][number]&{orderId:string}>();
  return rows.results.map(order=>({...order,items:items.results.filter(item=>item.orderId===order.id)}));
}
export async function updateOrderTracking(reference:string,input:Partial<{carrier:string;trackingNumber:string;trackingUrl:string;deliveryEstimate:string}>,expected?:Record<string,string>) {
  const order=await getOrderByReference(reference);if(!order)throw new Error("Order not found.");
  if(order.paymentStatus!=="paid")throw new Error("This order cannot receive tracking until payment is confirmed.");
  const columns={carrier:'carrier',trackingNumber:'tracking_number',trackingUrl:'tracking_url',deliveryEstimate:'delivery_estimate'};
  const keys=(Object.keys(columns) as Array<keyof typeof columns>).filter(k=>input[k]!==undefined);if(!keys.length)throw Error('Invalid tracking fields.');
  const guards=keys.filter(k=>expected&&Object.hasOwn(expected,k));
  const result=await getDbBinding().prepare(`UPDATE orders SET ${keys.map(k=>columns[k]+'=?').join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=? AND payment_status='paid'${guards.map(k=>' AND COALESCE('+columns[k]+",'')=?").join('')}`)
    .bind(...keys.map(k=>input[k]),order.id,...guards.map(k=>expected![k])).run();
  if(!result.meta.changes)throw Error('The order changed. Refresh before editing tracking.');
  const updated=await getDbBinding().prepare('SELECT carrier,tracking_number AS trackingNumber FROM orders WHERE id=?').bind(order.id).first<{carrier:string;trackingNumber:string}>();
  const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(updated&&keys.map(k=>[k,input[k]]))));
  const key=Array.from(new Uint8Array(hash)).map(n=>n.toString(16).padStart(2,"0")).join("");
  if(updated?.carrier&&updated?.trackingNumber)await queueOrderEmail(reference,`tracking:${key}`);
}

export async function listInventory(variantId?: string) {
  await ensureCatalogSeeded();
  const db = getDbBinding();
  const rows = await db
    .prepare(
      `SELECT v.id, v.product_id AS productId, v.sku, p.name AS productName,
              v.size, v.color, v.stock, v.active,
              COALESCE(r.reserved,0) AS reserved, MAX(0,v.stock-COALESCE(r.reserved,0)) AS available,
              p.price_kobo AS priceKobo, p.status AS productStatus
       FROM product_variants v JOIN products p ON p.id = v.product_id
       LEFT JOIN (SELECT variant_id,SUM(quantity) AS reserved FROM stock_reservations WHERE expires_at>CURRENT_TIMESTAMP GROUP BY variant_id) r ON r.variant_id=v.id
       ${variantId ? "WHERE v.id = ?" : ""}
       ORDER BY p.name, v.color, v.size, v.id`,
    )
    .bind(...(variantId ? [variantId] : []))
    .all();
  return rows.results;
}

export type AdminAnalytics = {
  bestSellers?: Array<{productId:string;name:string;units:number;revenueKobo:number}>;
  fulfilmentCount?: number;
  range?: import('./admin-reporting').ReportRange;
  conversion?: import('./admin-ga4').ConversionReport;
  trend: Array<{ label:string;date?:string;previousDate?:string;revenueKobo:number;orders:number;previousRevenueKobo?:number;previousOrders?:number }>;
  categoryMix: Array<{category:string;units:number}>;
};
export async function getAdminAnalytics(params=new URLSearchParams()):Promise<AdminAnalytics>{
 const {reportRange,reportTrend}=await import('./admin-reporting');
 const {conversionReport}=await import('./admin-ga4');
 const range=reportRange(params);await ensureCatalogSeeded();const db=getDbBinding();
 const [rows,demand,best,fulfilment,conversion]=await Promise.all([
  db.prepare(`SELECT substr(created_at,1,10) AS day,COUNT(*) AS orders,COALESCE(SUM(total_kobo),0) AS revenueKobo FROM orders WHERE created_at>=? AND created_at<? AND payment_status='paid' AND status<>'cancelled' GROUP BY substr(created_at,1,10) ORDER BY day`).bind(range.previousFrom,range.endExclusive).all<{day:string;orders:number;revenueKobo:number}>(),
  db.prepare(`SELECT p.category,SUM(oi.quantity) AS units FROM order_items oi JOIN products p ON p.id=oi.product_id JOIN orders o ON o.id=oi.order_id WHERE oi.is_gift=0 AND o.payment_status='paid' AND o.status<>'cancelled' AND o.created_at>=? AND o.created_at<? GROUP BY p.category ORDER BY units DESC`).bind(range.from,range.endExclusive).all<{category:string;units:number}>(),
  db.prepare(`SELECT oi.product_id AS productId,MAX(oi.product_name) AS name,SUM(oi.quantity) AS units,SUM(oi.line_total_kobo) AS revenueKobo FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.is_gift=0 AND o.payment_status='paid' AND o.status<>'cancelled' AND o.created_at>=? AND o.created_at<? GROUP BY oi.product_id ORDER BY revenueKobo DESC LIMIT 3`).bind(range.from,range.endExclusive).all<{productId:string;name:string;units:number;revenueKobo:number}>(),
  db.prepare("SELECT COUNT(*) AS n FROM orders WHERE payment_status='paid' AND status IN ('paid','processing')").first<{n:number}>(),conversionReport(range)
 ]);
 return {range,conversion,trend:reportTrend(range,rows.results),bestSellers:best.results,fulfilmentCount:Number(fulfilment?.n||0),categoryMix:demand.results};
}

export async function updateOrderStatus(reference: string, status: string, expectedStatus?: string, bulkVerified?: boolean) {
  const { allowedOrderStatuses } = await import("./order-status");
  const order = await getOrderByReference(reference);
  if (!order) throw new Error("Order not found.");
  if(expectedStatus!==undefined||bulkVerified){
    const {bulkOrderProblem,bulkSourceStatus}=await import('./bulk-orders');
    if(!bulkVerified||!Object.hasOwn(bulkSourceStatus,status)||expectedStatus!==bulkSourceStatus[status as keyof typeof bulkSourceStatus])throw new Error("This order cannot be updated without a valid bulk review.");
    const tracking=await getDbBinding().prepare('SELECT carrier,tracking_number AS trackingNumber FROM orders WHERE id=?').bind(order.id).first<{carrier:string;trackingNumber:string}>();
    const problem=bulkOrderProblem({...order,...tracking},status as keyof typeof bulkSourceStatus);
    if(problem)throw new Error(problem.startsWith('The order changed')?problem:'This order cannot be updated: '+problem);
  }
  if (!allowedOrderStatuses(order.status, order.paymentStatus).includes(status)) {
    throw new Error("This order cannot move to that status. Payment must be confirmed before fulfilment.");
  }
  if (status === order.status) { await queueOrderEmail(reference,`status:${status}`); return; }
  const db = getDbBinding();
  const allocateStock = order.status === "paid_stock_review" && status !== "cancelled";
  const token = crypto.randomUUID();
  const results = await db.batch([
    db.prepare(`UPDATE orders SET status = ?, allocation_token = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = ? AND payment_status = ?
      AND (? = 0 OR (trim(carrier)<>'' AND trim(tracking_number)<>''))
      AND (? = 0 OR NOT EXISTS (
        SELECT 1 FROM order_items oi LEFT JOIN product_variants v ON v.id = oi.variant_id
        WHERE oi.order_id = orders.id AND (v.id IS NULL OR
          v.stock - COALESCE((SELECT SUM(r.quantity) FROM stock_reservations r
            WHERE r.variant_id = v.id AND r.order_id <> orders.id AND r.expires_at > CURRENT_TIMESTAMP), 0) < (SELECT SUM(quantity) FROM order_items needed WHERE needed.order_id=oi.order_id AND needed.variant_id=oi.variant_id))
      ))`).bind(status, token, order.id, order.status, order.paymentStatus, bulkVerified && status!=="processing" ? 1 : 0, allocateStock ? 1 : 0),
    ...(allocateStock ? [db.prepare(`INSERT INTO stock_adjustments(variant_id,old_stock,new_stock,reason,actor) SELECT v.id,v.stock,v.stock-SUM(i.quantity),?,'payment review' FROM order_items i JOIN product_variants v ON v.id=i.variant_id WHERE i.order_id=? AND EXISTS(SELECT 1 FROM orders WHERE id=? AND allocation_token=?) GROUP BY v.id`).bind(`Sale ${reference}`,order.id,order.id,token),db.prepare(`UPDATE product_variants SET stock = stock - (
        SELECT SUM(quantity) FROM order_items WHERE order_id = ? AND variant_id = product_variants.id
      ), updated_at = CURRENT_TIMESTAMP WHERE id IN (SELECT variant_id FROM order_items WHERE order_id = ?)
      AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND allocation_token = ?)`)
      .bind(order.id, order.id, order.id, token)] : []),
    db.prepare("DELETE FROM stock_reservations WHERE order_id = ? AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND allocation_token = ?)")
      .bind(order.id, order.id, token),
    db.prepare("UPDATE orders SET allocation_token = NULL WHERE id = ? AND allocation_token = ?").bind(order.id, token),
  ]);
  if (!results[0].meta.changes) throw new Error("The order changed or stock is still unavailable. Refresh and check inventory before trying again.");
  await queueOrderEmail(reference,`status:${status}`);
}

export async function updateVariantStock(variantIdValue: string, stock: number, actor="administrator") {
  await ensureCatalogSeeded();
  if (!Number.isSafeInteger(stock) || stock < 0 || stock > 10_000) throw new Error("Invalid stock value.");
  const db=getDbBinding();
  await db.batch([
    db.prepare("INSERT INTO stock_adjustments (variant_id,old_stock,new_stock,reason,actor) SELECT id,stock,?, 'Inventory update',? FROM product_variants WHERE id=? AND stock<>?").bind(stock,actor,variantIdValue,stock),
    db.prepare("UPDATE product_variants SET stock=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(stock,variantIdValue),
  ]);
}

