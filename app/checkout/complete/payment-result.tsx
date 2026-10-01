"use client";

import { Check, LoaderCircle, PackageSearch, ReceiptText, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-client";
import { trackPurchase } from "@/lib/analytics";
import { readStorage, writeStorage } from "@/lib/browser-store";
import { CART_STORAGE_KEY, restoreCart } from "@/lib/cart";
import { PaymentReceipt } from "@/components/payment-receipt";
import { receiptMoney, type PaymentOrder } from "@/lib/payment-receipt";

type State = "checking" | "paid" | "review" | "pending" | "error";

export function PaymentResult({ reference }: { reference: string }) {
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState("Confirming your payment securely…");
  const [attempt, setAttempt] = useState(0);
  const [paidOrder, setPaidOrder] = useState<PaymentOrder|null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  useEffect(()=>{if(!paidOrder)return;const track=()=>trackPurchase({transactionId:paidOrder.reference,subtotalKobo:paidOrder.subtotalKobo,shippingKobo:paidOrder.shippingKobo,items:paidOrder.items});track();window.addEventListener("vanta-analytics-ready",track);return()=>window.removeEventListener("vanta-analytics-ready",track);},[paidOrder]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let checks = 0;
    const controller = new AbortController();
    setState("checking");
    setPaidOrder(null);
    setShowReceipt(false);
    setMessage("Confirming your payment securely…");
    async function verify() {
      try {
        let receiptToken="";try{receiptToken=sessionStorage.getItem(`vn-receipt:${reference}`)||"";}catch{/* Use private guest tracking when browser storage is unavailable. */}
        const response = await fetch(apiUrl(`/api/payments/verify?reference=${encodeURIComponent(reference)}`), { cache: "no-store", headers:{"X-Receipt-Token":receiptToken}, signal: controller.signal });
        const payload = await response.json() as { order?: PaymentOrder; message?: string; error?: string };
        if (!active) return;
        if (!response.ok) throw new Error(payload.error || "Payment confirmation is temporarily unavailable.");
        const order = payload.order;
        if (order && order.reference !== reference) throw new Error("The order reference could not be verified. Please contact customer care.");
        if (order?.paymentStatus === "paid") {
          const review = order.status === "paid_stock_review" || order.status === "cancelled";
          setState(review ? "review" : "paid");
          setMessage(review ? "Your payment was received. Customer care is reviewing your order before fulfilment. Please contact us with the reference below." : "Payment successful. Thank you for choosing Vanta Noir.");
          setPaidOrder(order);
          const clearedKey = `vanta-noir-cleared-${reference}`;
          if (!readStorage(clearedKey)) {
            try {
              const cart = restoreCart(JSON.parse(readStorage(CART_STORAGE_KEY) ?? "[]"));
              const purchased = new Map(order.items.map(item => [item.variantId, item.quantity]));
              const remaining = cart.flatMap(item => {
                const quantity = item.quantity - (purchased.get(item.variantId) ?? 0);
                return quantity > 0 ? [{ ...item, quantity }] : [];
              });
              writeStorage(CART_STORAGE_KEY, JSON.stringify(remaining));
              writeStorage(clearedKey, "1");
            } catch { /* A damaged local bag must not hide a confirmed payment. */ }
          }
          return;
        }
        setState("pending");
        setMessage("Your payment is still being confirmed. Keep your reference and check again shortly; please do not pay twice.");
        if (++checks < 6) timer = setTimeout(() => void verify(), 4000);
      } catch (error) {
        if (!active) return;
        setState("error");
        setMessage(error instanceof Error ? error.message : "We could not confirm payment yet. Please check again shortly.");
      }
    }
    void verify();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [reference, attempt]);

  const verifiedOrder = paidOrder?.reference === reference && (state === "paid" || state === "review") ? paidOrder : null;
  if (showReceipt && verifiedOrder) return <PaymentReceipt order={verifiedOrder} onBack={() => {
    setShowReceipt(false);
    window.requestAnimationFrame(() => document.getElementById("vn-view-receipt")?.focus());
  }}/>;
  return <div className="vn-payment-confirmation">
    <div className="vn-payment-brand">VANTA NOIR</div>
    {state === "paid" ? <div className="vn-success-art" aria-hidden="true"><div className="vn-success-handle"/><div className="vn-success-bag"><span>VANTA NOIR</span><div className="vn-success-check"><Check size={34} strokeWidth={2}/></div></div></div>
      : <div className={`vn-payment-state-icon ${state === "checking" ? "is-checking" : "is-warning"}`} aria-hidden="true">{state === "checking" ? <LoaderCircle size={42}/> : <TriangleAlert size={42}/>}</div>}
    <div role="status" aria-live="polite" aria-atomic="true">
      <h1>{state === "paid" ? "Order confirmed." : state === "checking" ? "Checking payment." : state === "review" ? "Payment received." : "Payment update."}</h1>
      <p className="vn-payment-message">{message}</p>
    </div>
    <div className="vn-confirmed-summary">
      <p className="vn-payment-reference"><span>ORDER REFERENCE</span>{reference}</p>
      {verifiedOrder && <><ul>{verifiedOrder.items.map((item, index) => <li key={`${item.variantId}-${index}`}><strong>{item.productName}</strong><span>{item.color} · {item.size} · Qty {item.quantity}</span></li>)}</ul><div className="vn-confirmed-total"><span>Total paid</span><strong>{receiptMoney(verifiedOrder.totalKobo)}</strong></div></>}
    </div>
    <div className="vn-receipt-actions">
      {verifiedOrder && <button type="button" id="vn-view-receipt" className="vn-payment-primary" onClick={() => setShowReceipt(true)}><ReceiptText size={18}/>View receipt</button>}
      {(state === "error" || state === "pending") && <button type="button" className="vn-payment-primary" onClick={() => setAttempt(value => value + 1)}>Check payment again</button>}
      <a className="vn-payment-secondary" href="/help-center#track-order"><PackageSearch size={18}/>{verifiedOrder ? "Track order" : "Track your order or get help"}</a>
      <a className="vn-payment-text-link" href="/#collection">Continue shopping</a>
    </div>
  </div>;
}
