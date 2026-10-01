import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

const result = await build({ entryPoints: ["lib/payment-receipt.ts"], bundle: true, write: false, platform: "node", format: "esm" });
const { receiptTotals, paymentReceiptHtml, receiptNeedsReview } = await import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64"));
const order = {
  reference: "VN-RECEIPT-TEST", paymentStatus: "paid", status: "processing",
  subtotalKobo: 10800000, discountKobo: 1200000, shippingKobo: 500000, totalKobo: 11300000,
  items: [{ variantId: "v1", productName: "STEALTH SET", color: "Dark Burgundy", size: "L", quantity: 2, unitPriceKobo: 6000000 }],
};

test("a discounted receipt reconstructs the gross subtotal and preserves the server total", () => {
  assert.deepEqual(receiptTotals(order), { subtotalKobo: 12000000, discountKobo: 1200000, shippingKobo: 500000, totalKobo: 11300000 });
  const html = paymentReceiptHtml(order);
  for (const amount of ["120,000.00", "12,000.00", "5,000.00", "113,000.00"]) assert.ok(html.includes(amount));
  assert.match(html, /Dark Burgundy \/ L \/ Qty 2/);
});

test("zero delivery and omitted discount remain valid; receipt amounts retain kobo", () => {
  const freeDelivery = { ...order, discountKobo: undefined, subtotalKobo: 150025, shippingKobo: 0, totalKobo: 150025 };
  assert.equal(receiptTotals(freeDelivery).subtotalKobo, 150025);
  const html = paymentReceiptHtml(freeDelivery);
  assert.ok(html.includes("1,500.25"));
  assert.doesNotMatch(html, /<dt>Discount<\/dt>/);
});

test("pending, failed and refunded orders cannot generate a paid receipt", () => {
  for (const paymentStatus of ["pending", "failed", "refunded"]) {
    assert.throws(() => paymentReceiptHtml({ ...order, paymentStatus }), /verified payment/);
  }
});

test("paid orders under review retain the fulfilment warning on their downloaded receipt", () => {
  for (const status of ["paid_stock_review", "cancelled"]) {
    const review = { ...order, status };
    assert.equal(receiptNeedsReview(review), true);
    assert.match(paymentReceiptHtml(review), /review before fulfilment/);
  }
  assert.equal(receiptNeedsReview(order), false);
});

test("download escapes order text and excludes private fields and receipt tokens", () => {
  const html = paymentReceiptHtml({ ...order, reference: '<script>alert("ref")</script>',
    email: "private@example.com", receiptToken: "secret-token-value",
    items: [{ ...order.items[0], productName: '<img src=x onerror="alert(1)">', color: "Black & Gold" }],
  });
  assert.doesNotMatch(html, /<script|<img|private@example\.com|secret-token-value/);
  assert.match(html, /&lt;img/);
  assert.match(html, /Black &amp; Gold/);
  assert.match(html, /default-src 'none'/);
});
