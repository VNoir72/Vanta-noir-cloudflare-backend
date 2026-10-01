"use client";
import { StoreShell } from "./store-shell";
import { PaymentResult } from "@/app/checkout/complete/payment-result";
export function PaymentCompletion({reference}:{reference:string|null}){return <StoreShell checkout><section className="vn-payment-panel">{reference?<PaymentResult key={reference} reference={reference}/>:<><h1>{reference===null?"Checking your payment reference…":"No payment reference found."}</h1><p className="vn-payment-message">If you have already paid, contact care with your payment reference before trying again.</p><a className="vn-payment-secondary" href="/help-center#track-order">Track your order or get help</a><a className="vn-payment-text-link" href="/">Return to the collection</a></>}</section></StoreShell>;}
