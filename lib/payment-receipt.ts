/** Values come from the authenticated payment-verification response, never the bag. */
export type PaymentOrder = {
  reference: string;
  paymentStatus: string;
  status: string;
  /** The existing API returns the merchandise subtotal AFTER its promotion. */
  subtotalKobo: number;
  discountKobo?: number;
  shippingKobo: number;
  totalKobo: number;
  items: Array<{
    variantId: string; productName: string; color: string; size: string;
    quantity: number; unitPriceKobo: number;
  }>;
};

export function receiptTotals(order: PaymentOrder) {
  const discountKobo = order.discountKobo ?? 0;
  return {
    subtotalKobo: order.subtotalKobo + discountKobo,
    discountKobo,
    shippingKobo: order.shippingKobo,
    totalKobo: order.totalKobo,
  };
}

export function receiptNeedsReview(order: PaymentOrder) {
  return order.status === "paid_stock_review" || order.status === "cancelled";
}

export function receiptMoney(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(kobo / 100);
}

const escapeHtml = (value: string | number) => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

/** A self-contained, printable receipt. No customer contact details or access tokens. */
export function paymentReceiptHtml(order: PaymentOrder) {
  if (order.paymentStatus !== "paid") throw new Error("A receipt requires a verified payment.");
  const totals = receiptTotals(order);
  const money = (value: number) => escapeHtml(receiptMoney(value));
  const rows = order.items.map(item => `<tr><td><strong>${escapeHtml(item.productName)}</strong><br><small>${escapeHtml(item.color)} / ${escapeHtml(item.size)} / Qty ${item.quantity}</small><br><small>${money(item.unitPriceKobo)} each</small></td><td>${money(item.unitPriceKobo * item.quantity)}</td></tr>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Vanta Noir receipt — ${escapeHtml(order.reference)}</title><style>
*{box-sizing:border-box}body{margin:0;padding:32px 16px;background:#e9e7e1;color:#191919;font:14px/1.65 ui-monospace,monospace}main{max-width:580px;margin:auto;padding:36px 24px;background:#faf8f2}header{text-align:center}h1{font:600 24px system-ui,sans-serif;letter-spacing:5px}header p{font-size:11px}h2{font-size:14px;font-weight:400;overflow-wrap:anywhere;margin:28px 0 16px}table{border-collapse:collapse;width:100%;table-layout:fixed}th{text-align:left;font-weight:400;font-size:12px}th:last-child,td:last-child{text-align:right;width:34%}td{padding:16px 0;border-bottom:1px dashed #b9b7af;vertical-align:top;overflow-wrap:anywhere}small{color:#555}dl div{display:flex;justify-content:space-between;gap:16px;margin:12px 0}dd{margin:0;text-align:right}.total{border-top:1px dashed #aaa;padding-top:16px;font-weight:bold;font-size:18px}.paid{display:table;margin:28px auto;border:2px solid #146b36;color:#146b36;padding:4px 18px;letter-spacing:4px;font-weight:bold}footer{text-align:center;font-size:12px}.note{padding:12px;border:1px solid #9b7940}body>p{max-width:580px;margin:20px auto;text-align:center;font:12px system-ui,sans-serif}@media print{body{background:white;padding:0}main{max-width:none}body>p{display:none}@page{margin:16mm}}
</style></head><body><main><header><h1>VANTA NOIR</h1><p>Presence. Power. Precision.</p></header><h2>Payment receipt<br>${escapeHtml(order.reference)}</h2><table><thead><tr><th>Item</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><dl><div><dt>Subtotal</dt><dd>${money(totals.subtotalKobo)}</dd></div>${totals.discountKobo ? `<div><dt>Discount</dt><dd>−${money(totals.discountKobo)}</dd></div>` : ""}<div><dt>Delivery</dt><dd>${money(totals.shippingKobo)}</dd></div><div class="total"><dt>Total paid</dt><dd>${money(totals.totalKobo)}</dd></div></dl><p class="paid">PAID</p>${receiptNeedsReview(order) ? '<p class="note">Payment received. Your order needs customer care review before fulfilment. Please contact us with your order reference.</p>' : ""}<footer>Thank you for your order.<br>vantanoir.store</footer></main><p>Keep this receipt. Use your browser’s Print option to print it or save it as a PDF.</p></body></html>`;
}
