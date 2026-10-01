"use client";

import { ArrowLeft, Download, PackageSearch } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { paymentReceiptHtml, receiptMoney, receiptNeedsReview, receiptTotals, type PaymentOrder } from "@/lib/payment-receipt";

export function PaymentReceipt({ order, onBack }: { order: PaymentOrder; onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [downloadError, setDownloadError] = useState("");
  useEffect(() => { heading.current?.focus(); }, []);
  if (order.paymentStatus !== "paid") return null;
  const totals = receiptTotals(order);
  function download() {
    try {
      const url = URL.createObjectURL(new Blob([paymentReceiptHtml(order)], { type: "text/html;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Vanta-Noir-Receipt-${order.reference.replace(/[^a-zA-Z0-9_-]/g, "_")}.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setDownloadError("");
    } catch {
      setDownloadError("The receipt could not be downloaded. You can keep a screenshot or contact customer care with your order reference.");
    }
  }
  return <div className="vn-receipt-view">
    <button type="button" className="vn-receipt-back" onClick={onBack}><ArrowLeft size={16}/>Back to confirmation</button>
    <h1 ref={heading} tabIndex={-1}>Your receipt.</h1>
    <p className="vn-receipt-intro">A little proof of what’s next.</p>
    <div className="vn-receipt-printer" aria-hidden="true"><span className="vn-printer-light"/><span className="vn-printer-wordmark">VANTA NOIR</span><span className="vn-printer-slot"/></div>
    <div className="vn-receipt-feed">
      <article className="vn-receipt-paper" aria-label="Payment receipt">
        <header><strong>VANTA NOIR</strong><p>Presence. Power. Precision.</p></header>
        <p className="vn-receipt-reference">PAYMENT RECEIPT<br/>{order.reference}</p>
        <ul className="vn-receipt-items">{order.items.map((item, index) => <li key={`${item.variantId}-${index}`}>
          <div><strong>{item.productName}</strong><span>{receiptMoney(item.unitPriceKobo * item.quantity)}</span></div>
          <p>{item.color} / {item.size} / Qty {item.quantity}</p>
          <p>{receiptMoney(item.unitPriceKobo)} each</p>
        </li>)}</ul>
        <dl className="vn-receipt-totals">
          <div><dt>Subtotal</dt><dd>{receiptMoney(totals.subtotalKobo)}</dd></div>
          {totals.discountKobo > 0 && <div><dt>Discount</dt><dd>−{receiptMoney(totals.discountKobo)}</dd></div>}
          <div><dt>Delivery</dt><dd>{receiptMoney(totals.shippingKobo)}</dd></div>
          <div className="vn-receipt-total"><dt>Total paid</dt><dd>{receiptMoney(totals.totalKobo)}</dd></div>
        </dl>
        <p className="vn-receipt-stamp">PAID</p>
        {receiptNeedsReview(order) && <p className="vn-receipt-review">Payment received. Customer care is reviewing your order before fulfilment.</p>}
        <footer>Thank you for your order.<span>vantanoir.store</span></footer>
      </article>
    </div>
    <div className="vn-receipt-actions">
      <button type="button" className="vn-payment-primary" onClick={download}><Download size={18}/>Download receipt</button>
      <p className="vn-download-hint">Printable HTML · Open to print or save as PDF</p>
      {downloadError && <p role="alert" className="vn-payment-message">{downloadError}</p>}
      <a className="vn-payment-secondary" href="/help-center#track-order"><PackageSearch size={18}/>Track order</a>
      <a className="vn-payment-text-link" href="/#collection">Continue shopping</a>
    </div>
  </div>;
}
