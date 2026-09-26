"use client";
import { useRef, useState, type FormEvent } from "react";
import { apiUrl } from "@/lib/api-client";

export function CustomerSignup({ variantId, productId, label }: { variantId?: string; productId?: string; label?: string }) {
  const submitting=useRef(false);
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(submitting.current)return; submitting.current=true; setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch(apiUrl("/api/subscriptions"), { method: "POST", headers: { "Content-Type": "application/json" }, signal:AbortSignal.timeout(15000), body: JSON.stringify({ email, kind: productId ? 'release' : variantId ? "restock" : "newsletter", productId:productId??'', variantId: variantId ?? "", consent: true }) });
      const payload = await response.json() as {error?: string}; if (!response.ok) throw new Error(payload.error || "Please try again.");
      setMessage("Your request is saved. Check your email for a confirmation link."); setEmail("");
    } catch (e) { setError(true); setMessage(e instanceof Error && e.name==='TimeoutError' ? 'The request timed out. Please try again.' : e instanceof Error ? e.message : "Please try again."); } finally { submitting.current=false;setBusy(false); }
  }
  return <form className="vn-signup" onSubmit={submit}>
    <label>{label ?? (productId ? 'Email me when this piece launches' : variantId ? "Email me when this size returns" : "Be first to hear about the next drop")}<div className="vn-signup-row"><input type="email" autoComplete="email" required maxLength={200} placeholder="Your email address" value={email} onChange={event => setEmail(event.target.value)} /><button type="submit" disabled={busy}>{busy ? "Saving…" : productId || variantId ? "Notify me" : "Join the list"}</button></div></label>
    <label className="vn-consent-label"><input type="checkbox" required />{productId ? 'Email me about the release of this piece only.' : variantId ? "Email me about this size becoming available." : "I agree to receive Vanta Noir collection news by email."} <a href="/privacy-policy">Privacy policy</a></label>
    {message && <p role={error ? "alert" : "status"}>{message}</p>}
  </form>;
}
