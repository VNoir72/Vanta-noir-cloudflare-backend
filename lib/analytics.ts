import type { CartItem } from "./cart";
import type { CatalogProduct } from "./catalog";

type AnalyticsWindow = Window & { gtag?: (...args: unknown[]) => void; "ga-disable-G-29RJ57JB76"?: boolean };
function analyticsAllowed(){if(typeof window === "undefined")return false;try{return window.localStorage.getItem("vanta-noir-analytics-consent")==="granted" && !(window as AnalyticsWindow)["ga-disable-G-29RJ57JB76"];}catch{return false;}}
export function trackEvent(name: string, properties: Record<string, unknown> = {}) {
  if (!analyticsAllowed()) return;
  (window as AnalyticsWindow).gtag?.("event", name, properties);
}
export function trackProducts(event: "view_item" | "view_item_list" | "select_item" | "add_to_wishlist", products: CatalogProduct[]) {
  trackEvent(event, { currency: "NGN", items: products.map(p => ({ item_id: p.id, item_name: p.name, item_brand: "Vanta Noir", item_category: p.category, price: p.priceKobo / 100 })) });
}
export function ecommerceItems(items: CartItem[]) {
  return items.map(item => ({
    item_id: item.variantId, item_name: item.name, item_brand: "Vanta Noir",
    item_variant: `${item.color} / ${item.size}`, price: item.priceKobo / 100,
    quantity: item.quantity,
  }));
}

export function trackCommerce(event: "add_to_cart" | "remove_from_cart" | "view_cart" | "begin_checkout" | "add_to_wishlist", items: CartItem[]) {
  if (!analyticsAllowed()) return;
  (window as AnalyticsWindow).gtag?.("event", event, {
    currency: "NGN", value: items.reduce((sum, item) => sum + item.priceKobo * item.quantity, 0) / 100,
    items: ecommerceItems(items),
  });
}

export function trackPurchase(purchase: {
  transactionId: string; subtotalKobo: number; shippingKobo: number;
  items: Array<{ variantId: string; productName: string; color: string; size: string; quantity: number; unitPriceKobo: number }>;
}) {
  if (!analyticsAllowed() || !(window as AnalyticsWindow).gtag) return;
  const key = `vanta-noir-purchase-${purchase.transactionId}`;
  try { if (window.localStorage.getItem(key)) return; } catch { /* GA also deduplicates by transaction_id. */ }
  (window as AnalyticsWindow).gtag?.("event", "purchase", {
    transaction_id: purchase.transactionId, currency: "NGN",
    value: purchase.subtotalKobo / 100, shipping: purchase.shippingKobo / 100,
    items: purchase.items.map(item => ({ item_id: item.variantId, item_name: item.productName,
      item_brand: "Vanta Noir", item_variant: `${item.color} / ${item.size}`,
      price: item.unitPriceKobo / 100, quantity: item.quantity })),
  });
  try { window.localStorage.setItem(key, "1"); } catch { /* Optional browser storage. */ }
}
