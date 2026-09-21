"use client";
import { StoreShell } from "./store-shell";
import { PaymentResult } from "@/app/checkout/complete/payment-result";
export function PaymentCompletion({reference}:{reference:string|null}){return <StoreShell><section className="dn-panel dn-payment-result">{reference?<PaymentResult reference={reference}/>:<><h1>{reference===null?"Checking your payment reference…":"No payment reference found."}</h1><p>If you have already paid, contact care with your payment reference before trying again.</p><a href="/contact">Contact customer care</a></>}<a className="dn-primary" href="/">Return to the collection</a></section></StoreShell>;}
