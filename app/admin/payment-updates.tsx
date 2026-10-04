"use client";
import {useEffect,useState} from 'react';
type Update={event:string;reference:string;providerId:string;providerStatus:string;receivedAt:string;matched:boolean};
export function PaymentUpdates(){
 const [updates,setUpdates]=useState<Update[]>([]),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();const load=async()=>{try{const r=await fetch('/api/admin/payment-updates',{signal:controller.signal,cache:'no-store'});if(!r.ok)throw new Error('Payment alerts could not load. Check Paystack directly.');const data=await r.json() as {updates:Update[]};setUpdates(data.updates);setError('');}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Payment alerts unavailable.');}};void load();const timer=setInterval(()=>{if(!document.hidden)void load();},60000);return()=>{controller.abort();clearInterval(timer);};},[]);
 if(!updates.length&&!error)return null;
 return <details className="bg-[#141414] px-5 py-3 text-sm text-white"><summary>Paystack refunds &amp; disputes · {updates.length} recent updates</summary><p>Review these updates in Paystack before fulfilling an affected order. Refunds and dispute decisions remain under your control. This is an event history; later rows may supersede earlier updates.</p>{error&&<p role="alert">{error}</p>}<ul>{updates.map((u,i)=><li className="my-3" key={u.receivedAt+i}><strong>{u.event}</strong> · {u.reference||'Unmatched transaction'} · {u.providerStatus||'Review in Paystack'} · {u.providerId} · {new Date(u.receivedAt).toLocaleString()}</li>)}</ul><a href="https://dashboard.paystack.com" target="_blank" rel="noreferrer" className="underline">Open Paystack</a></details>;
}
