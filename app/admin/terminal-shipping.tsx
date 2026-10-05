'use client';
import {OrderParcel} from './parcel-profiles';
import {useState,useRef,useEffect} from 'react';
import {NIGERIA_STATES} from '@/lib/commerce-config';
import type {DeliverySession} from '@/lib/terminal-delivery';
import type {AdminOrder} from '@/lib/store-db';
const money=(n:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN'}).format(n/100);
export function TerminalShipping({order}:{order?:AdminOrder}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[session,setSession]=useState<DeliverySession|null>(null),[history,setHistory]=useState<DeliverySession[]>([]),[selected,setSelected]=useState(''),[confirmed,setConfirmed]=useState(false);
 const lock=useRef(false),id=useRef('');
 const [address,setAddress]=useState({city:order?.city||'Ikeja',state:order?.state||'Lagos',line1:order?.addressLine1||'1 Allen Avenue',zip:order?.addressLine2?.match(/Postal code:\s*(\d{6})/)?.[1]||''});
 const [parcel,setParcel]=useState({weightKg:'',lengthCm:'',widthCm:'',heightCm:'',valueNaira:order?String(order.totalKobo/100):'10000'});
 async function load(){setError('');try{const r=await fetch('/api/admin/terminal-shipping'+(order?'?reference='+encodeURIComponent(order.reference):''),{cache:'no-store'});const data=await r.json() as any;if(!r.ok)throw new Error(data.error||'Could not load tests');setHistory(data.sessions);if(order&&data.sessions[0])view(data.sessions[0]);}catch(e){setError((e as Error).message);}}
 useEffect(()=>{if(open)void load();},[open]);
 function view(s:DeliverySession){setSession(s);setAddress(s.input.destination);setParcel(Object.fromEntries(Object.entries(s.input.parcel).map(([k,v])=>[k,String(v)])) as typeof parcel);setSelected(s.selected?.id||'');setConfirmed(false);id.current=s.input.id;}
 async function act(action:'quote'|'book'|'track'){
 if(lock.current)return;lock.current=true;setBusy(true);setError('');
 try{if(!id.current)id.current=crypto.randomUUID();const rate=session?.rates.find(r=>r.id===selected);
 const body=action==='quote'?{action,input:{id:id.current,reference:order?.reference,destination:address,parcel:Object.fromEntries(Object.entries(parcel).map(([k,v])=>[k,Number(v)]))}}:action==='book'?{action,id:session?.id,rateId:selected,expectedKobo:rate?.amountKobo,confirmed}:{action,id:session?.id};
 const r=await fetch('/api/admin/terminal-shipping',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});const data=await r.json() as any;if(!r.ok)throw new Error(data.error||'Test request failed');setSession(data.session);setConfirmed(false);if(action==='quote')setSelected('');
 }catch(e){setError((e as Error).name==='TimeoutError'?'Response timed out. Use Refresh saved test before retrying; a booking may still be running.':(e as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 async function refresh(){const savedId=session?.id||(order?'order-'+order.reference:id.current);if(!savedId){await load();return;}try{const r=await fetch('/api/admin/terminal-shipping?id='+encodeURIComponent(savedId),{cache:'no-store'});const data=await r.json() as any;if(!r.ok)throw new Error(data.error);setSession(data.session);}catch(e){setError((e as Error).message);}}
 const locked=session&&!['quoted','quote_failed'].includes(session.stage);
 const rate=session?.rates.find(r=>r.id===selected);
 const eligible=!order||(order.paymentStatus==='paid'&&['paid','processing'].includes(order.status));
 return <section className="vn-product-disclosure" style={{minWidth:0,maxWidth:'100%'}}><button type="button" className="vn-pill" onClick={()=>setOpen(!open)} aria-expanded={open}>{order?'Test delivery — sandbox':'Open sandbox checkout & delivery'}</button>{open&&<div>
 <h3>Sandbox checkout &amp; delivery {order?`· ${order.reference}`:''}</h3><p>Test only. No real payment, pickup, customer email or fulfilment update. Uses your saved test contact for both ends. Enter the whole packed parcel weight and dimensions; measurements are centimetres.</p>
 {!eligible&&<p role="alert">This order must be paid and unshipped before testing delivery.</p>}
 <fieldset disabled={busy||!!locked||!eligible} style={{minWidth:0,border:0,padding:0}}>{order&&<OrderParcel reference={order.reference} onUse={suggestion=>{setParcel({...parcel,weightKg:String(suggestion.weightKg),lengthCm:String(suggestion.lengthCm),widthCm:String(suggestion.widthCm),heightCm:String(suggestion.heightCm)});setSession(null);setSelected('');setConfirmed(false);}}/>}<div className="vn-admin-fields">
 {(['line1','city','zip'] as const).map(k=><label key={k}>{({line1:'Test delivery address',city:'City',zip:'Six-digit postcode'})[k]}<input value={address[k]} maxLength={k==='zip'?6:200} onChange={e=>{setAddress({...address,[k]:e.target.value});setSession(null);setSelected('');setConfirmed(false);}}/></label>)}
 <label>State<select value={address.state} onChange={e=>{setAddress({...address,state:e.target.value});setSession(null);setSelected('');setConfirmed(false);}}>{NIGERIA_STATES.map(v=><option key={v}>{v}</option>)}</select></label>
 {Object.entries({weightKg:'Packed weight (kg)',lengthCm:'Length (cm)',widthCm:'Width (cm)',heightCm:'Height (cm)',valueNaira:'Declared item value (₦)'}).map(([k,label])=><label key={k}>{label}<input type="number" min="0.01" step="0.01" value={parcel[k as keyof typeof parcel]} onChange={e=>{setParcel({...parcel,[k]:e.target.value});setSession(null);setSelected('');setConfirmed(false);}}/></label>)}
 </div><button type="button" className="vn-pill" onClick={()=>void act('quote')}>Get sandbox delivery quotes</button></fieldset>
 {busy&&<p role="status">Working with Terminal… Please wait.</p>}{error&&<p role="alert">{error}</p>}{session&&<div><p>Saved test: {session.id} · {session.stage}</p>{session.error&&<p role="alert">{session.error}</p>}
 {session.stage==='quoted'&&<><p>Quotes expire at {session.expiresAt?new Date(session.expiresAt).toLocaleTimeString():''}. Select a courier to preview the test checkout total.</p>{session.rates.map(r=><label key={r.id} style={{display:'block',padding:'8px 0'}}><input type="radio" name={'terminal-rate-'+session.id} disabled={busy} checked={selected===r.id} onChange={()=>{setSelected(r.id);setConfirmed(false);}}/> {r.carrier} · {money(r.amountKobo)} · {r.delivery}</label>)}{rate&&<><p>Item value {money(Math.round(session.input.parcel.valueNaira*100))} + delivery {money(rate.amountKobo)} = <strong>{money(Math.round(session.input.parcel.valueNaira*100)+rate.amountKobo)} test total</strong></p><label style={{display:'block'}}><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/> I verified these test details and confirm {rate.carrier} at {money(rate.amountKobo)}. {session.reference?'The source order is paid.':'Simulate a paid order; no payment is collected.'}</label><button type="button" className="vn-pill" disabled={busy||!confirmed} onClick={()=>void act('book')}>Confirm sandbox booking</button></>}</>}
 {session.shipmentId&&<><p>Sandbox shipment: {session.shipmentId}</p><p>Status: {session.tracking?.status||'Awaiting update'} · Tracking: {session.tracking?.number||'Not assigned yet'}</p>{session.tracking?.url&&<a href={session.tracking.url} target="_blank" rel="noopener noreferrer">Open courier tracking</a>}<button type="button" className="vn-pill" disabled={busy} onClick={()=>void act('track')}>Refresh sandbox tracking</button><ol>{session.tracking?.events.map((e,i)=><li key={i}>{e.status} {e.at}</li>)}</ol></>}
 </div>}<button type="button" className="vn-pill" disabled={busy} onClick={()=>void refresh()}>Refresh saved test</button>
 {!order&&<><button type="button" className="vn-pill" disabled={busy} onClick={()=>{id.current='';setSession(null);setSelected('');setConfirmed(false);void load();}}>Start another test</button>{history.length>0&&<details><summary>Previous sandbox tests</summary>{history.map(s=><button type="button" className="vn-pill" key={s.id} disabled={busy} onClick={()=>view(s)}>{s.input.destination.city} · {s.stage} · {new Date(s.createdAt).toLocaleString()}</button>)}</details>}</>}
 </div>}</section>;
}
