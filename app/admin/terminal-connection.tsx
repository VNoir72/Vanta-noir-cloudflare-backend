'use client';
import {useEffect,useRef,useState} from 'react';
import {TerminalShipping} from './terminal-shipping';
import {adminRead} from '@/lib/admin-read';
export function TerminalConnection(){
 const [data,setData]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);const lock=useRef(false);
 async function load(){try{setData(await adminRead('/api/admin/terminal',v=>v?.mode==='sandbox'));setError('');}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void load();},[]);
 async function run(){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const response=await fetch('/api/admin/terminal',{method:'POST',credentials:'same-origin'});const result=await response.json() as any;if(!response.ok)throw new Error(result.error||'Test could not start');setData(result);}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}}
 const pending=['queued','running'].includes(data?.job?.status);
 return <section className="vn-product-disclosure"><h3>Terminal Africa — sandbox testing</h3><p>{data?.configured?'Test credential saved.':'Test credential not confirmed.'} Live delivery booking and checkout quotes are not enabled.</p><p>Tests a 5 kg parcel (53.34 × 30.48 × 12.70 cm) from Barnawa to four destinations and one invalid address. Recipient details and ₦10,000 declared value are synthetic. No shipment is booked.</p><button className="vn-pill" disabled={busy||pending||!data?.configured} onClick={run}>{busy?'Queuing…':pending?'Test queued / running':'Run sandbox quote tests'}</button> <button className="vn-pill" onClick={load}>Refresh test results</button><p>Queued tests run within approximately five minutes.</p>{error&&<p role="alert">{error}</p>}{data?.job?.error&&<p role="alert">{data.job.error}</p>}{data?.job?.report?.results?.map((r:any)=><div key={r.destination}><strong>{r.destination}: {r.status}</strong>{r.message&&<p>{r.message}</p>}{r.rates.map((rate:any,i:number)=><p key={i}>{rate.carrier}: ₦{rate.amount.toLocaleString()} · {rate.delivery} (test quote)</p>)}</div>)}<TerminalShipping/></section>;
}
