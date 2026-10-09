"use client";
import {adminRead} from '@/lib/admin-read';
import {useEffect,useState} from 'react';
type Update={event:string;reference:string;providerId:string;providerStatus:string;receivedAt:string;matched:boolean};
export function PaymentUpdates(){
 const [updates,setUpdates]=useState<Update[]>([]),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();let pending=false;const load=async()=>{if(pending)return;pending=true;try{const data=await adminRead<{updates:Update[]}>('/api/admin/payment-updates',v=>Array.isArray(v?.updates)&&v.updates.every((u:Update)=>u&&typeof u.event==='string'&&typeof u.receivedAt==='string'),{signal:controller.signal});if(!controller.signal.aborted){setUpdates(data.updates);setError('');}}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Payment alerts unavailable.');}finally{pending=false;}};void load();const timer=setInterval(()=>{if(!document.hidden)void load();},60000);return()=>{controller.abort();clearInterval(timer);};},[]);
 if(!updates.length&&!error)return null;
 return <details open={Boolean(error)} className="bg-muted px-5 py-3 text-sm text-foreground"><summary>Paystack refunds &amp; disputes · {error?"Status unavailable":`${updates.length} recent updates`}</summary><p>Review these updates in Paystack before fulfilling an affected order. Refunds and dispute decisions remain under your control. This is an event history; later rows may supersede earlier updates.</p>{error&&<p role="alert">{error}</p>}<ul>{updates.map((u,i)=><li className="my-3" key={u.receivedAt+i}><strong>{u.event}</strong> · {u.reference||'Unmatched transaction'} · {u.providerStatus||'Review in Paystack'} · {u.providerId} · {new Date(u.receivedAt).toLocaleString()}</li>)}</ul><a href="https://dashboard.paystack.com" target="_blank" rel="noreferrer" className="underline">Open Paystack</a></details>;
}
