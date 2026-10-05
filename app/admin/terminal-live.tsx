'use client';
import {useEffect,useRef,useState} from 'react';
import {adminRead} from '@/lib/admin-read';
export function TerminalLive(){
 const [data,setData]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);const lock=useRef(false);
 async function load(){try{setData(await adminRead('/api/admin/terminal-live',v=>v?.mode==='live'));setError('');}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void load();},[]);
 const pending=['queued','running'].includes(data?.check?.status);
 useEffect(()=>{if(!pending)return;const timer=setInterval(()=>{void load();},15000);return()=>clearInterval(timer);},[pending]);
 async function check(){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const r=await fetch('/api/admin/terminal-live',{method:'POST',credentials:'same-origin'});const v=await r.json() as any;if(!r.ok)throw Error(v.error||'Could not start connection check.');setData(v);}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}}
 return <section className="vn-product-disclosure"><h3>Terminal Africa — live account</h3><p>{data?.configured?'Live secret saved.':'Live secret not confirmed.'} {data?.check?.status==='connected'?'Live account authenticated.':data?.check?.status==='failed'?'Live account verification failed.':'Live account verification pending.'}</p>{data?.check?.checkedAt&&<p>Last checked: {new Date(data.check.checkedAt).toLocaleString()}</p>}{data?.check?.status==='connected'&&<p>Wallet: {data.check.walletActive&&data.check.walletEnabled?'enabled':'requires attention in Terminal Africa'}.</p>}<p>Pickup details: {data?.pickupReady?'saved':'not filled in'}. Live checkout quotes and shipment booking remain disabled. Add the real pickup details and packed parcel measurements before activation.</p><button className="vn-pill" onClick={check} disabled={busy||pending||!data?.configured}>{busy||pending?'Checking connection…':'Check live connection'}</button> <button className="vn-pill" onClick={load}>Refresh connection status</button><p>The check runs within five minutes. It reads account status only and does not book or charge for a shipment.</p>{(error||data?.check?.error)&&<p role="alert">{error||data.check.error}</p>}</section>;
}
