"use client";

import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-client";
import { trackPurchase } from "@/lib/analytics";
import { readStorage, writeStorage } from "@/lib/browser-store";
import { CART_STORAGE_KEY, restoreCart } from "@/lib/cart";

type State = "checking" | "paid" | "review" | "pending" | "error";
type PaymentOrder = {
  reference: string; paymentStatus: string; status: string; subtotalKobo: number; shippingKobo: number;
  items: Array<{ variantId: string; productName: string; color: string; size: string; quantity: number; unitPriceKobo: number }>;
};

export function PaymentResult({ reference }: { reference: string }) {
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState("Confirming your payment securely…");
  const [attempt, setAttempt] = useState(0);
  const [paidOrder, setPaidOrder] = useState<PaymentOrder|null>(null);
  useEffect(()=>{if(!paidOrder)return;const track=()=>trackPurchase({transactionId:paidOrder.reference,subtotalKobo:paidOrder.subtotalKobo,shippingKobo:paidOrder.shippingKobo,items:paidOrder.items});track();window.addEventListener("vanta-analytics-ready",track);return()=>window.removeEventListener("vanta-analytics-ready",track);},[paidOrder]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let checks = 0;
    const controller = new AbortController();
    setState("checking");
    async function verify() {
      try {
        const response = await fetch(apiUrl(`/api/payments/verify?reference=${encodeURIComponent(reference)}`), { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as { order?: PaymentOrder; message?: string; error?: string };
        if (!active) return;
        if (!response.ok) throw new Error(payload.error || "Payment confirmation is temporarily unavailable.");
        const order = payload.order;
        if (order?.paymentStatus === "paid") {
          const review = order.status === "paid_stock_review" || order.status === "cancelled";
          setState(review ? "review" : "paid");
          setMessage(review ? "Your payment was received. Customer care is reviewing your order before fulfilment. Please contact us with the reference below." : "Your payment is confirmed and your order is now in fulfilment.");
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

  const Icon = state === "paid" ? CheckCircle2 : state === "checking" ? LoaderCircle : TriangleAlert;
  return <div className="mt-9" aria-live="polite">
    <Icon className={`mx-auto size-11 ${state === "checking" ? "animate-spin text-white/50" : state === "paid" ? "text-emerald-400" : "text-amber-400"}`} />
    <h1 className="mt-6 font-sans text-4xl">{state === "paid" ? "Order confirmed." : state === "checking" ? "Checking payment." : state === "review" ? "Payment received." : "Payment update."}</h1>
    <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/70">{message}</p>
    <p className="mt-6 break-all bg-black/30 p-3 font-mono text-xs text-white/60">{reference}</p>
    {(state === "error" || state === "pending") && <button type="button" className="mt-5 border border-white/25 px-5 py-3 text-sm" onClick={() => setAttempt(value => value + 1)}>Check payment again</button>}
    <a className="mt-5 block text-sm underline" href="/help-center#track-order">Track your order or get help</a>
  </div>;
}
