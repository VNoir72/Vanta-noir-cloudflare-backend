"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import { apiUrl } from "@/lib/api-client";

export function CustomerSignup({ variantId, productId, label, hideHeading=false, onSubscribed }: { variantId?: string; productId?: string; label?: string; hideHeading?:boolean; onSubscribed?:()=>void }) {
  const submitting=useRef(false);
  const emailId=useId();
  const newsletter=!productId&&!variantId;
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(submitting.current)return; submitting.current=true; setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch(apiUrl("/api/subscriptions"), { method: "POST", headers: { "Content-Type": "application/json" }, signal:AbortSignal.timeout(15000), body: JSON.stringify({ email, kind: productId ? 'release' : variantId ? "restock" : "newsletter", productId:productId??'', variantId: variantId ?? "", consent: true }) });
      const payload = await response.json() as {error?: string}; if (!response.ok) throw new Error(payload.error || "Please try again.");
      setMessage("Your request is saved. Check your email for a confirmation link."); setEmail(""); onSubscribed?.();
    } catch (e) { setError(true); setMessage(e instanceof Error && e.name==='TimeoutError' ? 'The request timed out. Please try again.' : e instanceof Error ? e.message : "Please try again."); } finally { submitting.current=false;setBusy(false); }
  }
  return <form className="vn-signup" onSubmit={submit}>
    {newsletter&&<>{!hideHeading&&<h2 className="vn-newsletter-title">{label ?? "Stay updated with Vanta Noir"}</h2>}<p id={`${emailId}-description`}>Get email updates on new arrivals, upcoming collections and restocks.</p></>}
    <label htmlFor={emailId} className={newsletter?'vn-email-label':undefined}>{newsletter ? 'Email address' : label ?? (productId ? 'Email me when this piece launches' : 'Email me when this size returns')}</label>
    <div className="vn-signup-row"><input id={emailId} aria-describedby={newsletter?`${emailId}-description`:undefined} type="email" autoComplete="email" required maxLength={200} placeholder="Your email address" value={email} onChange={event => setEmail(event.target.value)} /><button type="submit" disabled={busy}>{busy ? "Saving…" : newsletter ? "Subscribe" : "Notify me"}</button></div>
    <label className="vn-consent-label"><input type="checkbox" required />{productId ? 'Email me about the release of this piece only.' : variantId ? "Email me about this size becoming available." : "I agree to receive Vanta Noir collection news by email."} <a href="/privacy-policy">Privacy policy</a></label>
    {newsletter&&<p>Unsubscribe at any time.</p>}
    {message && <p role={error ? "alert" : "status"}>{message}</p>}
  </form>;
}
