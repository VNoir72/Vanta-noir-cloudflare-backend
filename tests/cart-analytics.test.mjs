import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";

await mkdir("work", { recursive: true });
await build({ entryPoints: ["lib/cart.ts", "lib/analytics.ts"], outdir: "work/cart-tests", bundle: true, format: "esm", platform: "node", outExtension: { ".js": ".mjs" } });
const { restoreCart, reconcileCart } = await import("../work/cart-tests/cart.mjs");
const { trackCommerce, trackPurchase } = await import("../work/cart-tests/analytics.mjs");
const item = { productId: "p1", variantId: "persisted-database-id", name: "Hoodie", size: "M", color: "Jet Black", imageUrl: "/images/hoodie.webp", priceKobo: 11000000, quantity: 3 };

test("corrupt saved bags cannot bypass stock, quantity, or current prices", () => {
  assert.deepEqual(restoreCart("invalid"), []);
  assert.deepEqual(restoreCart([item, item, null, { ...item, quantity: -1 }, { ...item, quantity: 500 }]), [item]);
  const products = [{ id: "p1", name: "Updated hoodie", priceKobo: 12000000, colorways: [{ name: "Charcoal", imageUrl: "/new.webp", variantIds: { M: item.variantId }, stock: { M: 1 } }] }];
  const bag = reconcileCart([item], products);
  assert.equal(bag.length, 1);
  assert.equal(bag[0].quantity, 1);
  assert.equal(bag[0].priceKobo, 12000000);
  assert.equal(bag[0].color, "Charcoal");
  products[0].colorways[0].stock.M = 0;
  assert.deepEqual(reconcileCart(bag, products), []);
});

test("analytics use naira values and purchase events are deduplicated", () => {
  const events = [], stored = new Map([["vanta-noir-analytics-consent", "granted"]]);
  globalThis.window = { gtag: (...args) => events.push(args), localStorage: { getItem: k => stored.get(k), setItem: (k, v) => stored.set(k, v) } };
  try {
    trackCommerce("add_to_cart", [item]);
    assert.equal(events[0][2].value, 330000);
    assert.equal(events[0][2].items[0].price, 110000);
    const purchase = { transactionId: "VN-TEST", subtotalKobo: 33000000, shippingKobo: 200000, items: [{ variantId: item.variantId, productName: item.name, color: item.color, size: item.size, quantity: 3, unitPriceKobo: item.priceKobo }] };
    trackPurchase(purchase);
    trackPurchase(purchase);
    assert.equal(events.length, 2);
    assert.equal(events[1][1], "purchase");
    assert.equal(events[1][2].value, 330000);
    assert.equal(events[1][2].shipping, 2000);
    assert.equal(events[1][2].transaction_id, purchase.transactionId);
    assert.equal(events[1][2].email, undefined);
  } finally { delete globalThis.window; }
});
