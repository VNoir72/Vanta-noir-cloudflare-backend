import { variantId, type CatalogProduct, type CatalogColorway } from "./catalog";
export const CART_STORAGE_KEY = "vn-discover-bag-v1";

export type CartItem = {
  productId: string; variantId: string; name: string; size: string;
  color: string; imageUrl: string; priceKobo: number; quantity: number;
};

export function catalogVariantId(product: CatalogProduct, size: string, color: CatalogColorway) {
  return color.variantIds?.[size] ?? variantId(product.id, size, color.name);
}

export function cartInventory(products: CatalogProduct[]) {
  const result = new Map<string, CartItem & { available: number }>();
  for (const product of products) for (const color of product.colorways) {
    for (const [size, stock] of Object.entries(color.stock)) {
      const id = catalogVariantId(product, size, color);
      result.set(id, {
        productId: product.id, variantId: id, name: product.name,
        size, color: color.name, imageUrl: color.imageUrl,
        priceKobo: product.priceKobo, quantity: 1,
        available: product.details?.availability === "preview" || product.details?.priceStatus === "proposed" ? 0 : Math.max(0, Math.min(5, Math.floor(stock))),
      });
    }
  }
  return result;
}

export function restoreCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.filter(item => {
    if (!item || typeof item !== "object" || !Number.isSafeInteger(item.quantity)
      || item.quantity < 1 || item.quantity > 5 || !Number.isSafeInteger(item.priceKobo)
      || item.priceKobo < 0 || !["productId", "variantId", "name", "size", "color", "imageUrl"]
        .every(key => typeof item[key] === "string" && item[key].length <= 1200)
      || ids.has(item.variantId)) return false;
    ids.add(item.variantId);
    return true;
  }).slice(0, 20);
}

export function reconcileCart(cart: CartItem[], products: CatalogProduct[]): CartItem[] {
  const inventory = cartInventory(products);
  return cart.flatMap(item => {
    const current = inventory.get(item.variantId);
    if (!current || !current.available) return [];
    const { available, ...updated } = current;
    return [{ ...updated, quantity: Math.min(item.quantity, available) }];
  });
}
