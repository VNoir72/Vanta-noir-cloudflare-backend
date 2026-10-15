'use client';
import {useEffect,useState} from 'react';
import {Truck,Wallet,RefreshCw,ArrowUpRight,AlertTriangle,CheckCircle2} from 'lucide-react';
import {ParcelProfiles} from './parcel-profiles';
import {TerminalPickup} from './terminal-pickup';
import {adminRead} from '@/lib/admin-read';
type Health={keyConfigured:boolean;checkoutEnabled:boolean;pickupReady:boolean;connection:null|{status:string;checkedAt:string;balanceKobo?:number;lowBalance?:boolean;error?:string};checkoutIssue:null|{kind:string;checkedAt:string}};
export function ShippingControls(){
 const [data,setData]=useState<Health|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();adminRead<Health>('/api/admin/shipping-health',v=>v?.provider==='shipbubble',{signal:controller.signal}).then(setData).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[]);
 async function check(){if(busy)return;setBusy(true);setError('');try{const r=await fetch('/api/admin/shipping-health',{method:'POST'});const d=await r.json() as Health&{error?:string};if(!r.ok)throw Error(d.error||'Could not check wallet.');setData(d);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const c=data?.connection,issue=data?.checkoutIssue,activeIssue=issue&&Date.now()-Date.parse(issue.checkedAt)<3600000;
 return <section className="vn-shipping-controls" aria-busy={busy}><header><span className="vn-shipping-provider-icon"><Truck size={22}/></span><div><h3>Shipbubble</h3><p>Your only active shipping provider · website & app</p></div><span className="vn-status-chip is-success">Selected</span></header>
 <div className="vn-shipping-wallet"><Wallet size={20}/><div><strong>{typeof c?.balanceKobo==='number'?new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN'}).format(c.balanceKobo/100):'Wallet not checked'}</strong><small>{c?.checkedAt?'Last checked '+new Date(c.checkedAt).toLocaleString():'Use Check balance to verify your wallet.'}</small></div><button className="vn-pill" onClick={check} disabled={busy}><RefreshCw size={15} className={busy?'vn-spin':''}/>{busy?'Checking…':'Check balance'}</button></div>
 {c?.lowBalance&&<p className="vn-shipping-warning" role="status"><AlertTriangle size={18}/>Wallet below ₦5,000. Top up in Shipbubble to protect address validation and dispatch. This is a warning threshold, not a guarantee of sufficient funds for every shipment.</p>}
 {activeIssue&&<p className="vn-shipping-warning" role="status"><AlertTriangle size={18}/>{issue.kind==='funding'?'Shipbubble recently rejected checkout because of wallet or address credits. Check funding, then retry.':'Shipbubble recently rejected a quote. Check the connection and courier coverage, then retry.'}</p>}
 {error&&<p role="alert">{error}</p>}{c?.status==='failed'&&<p role="alert">{c.error}</p>}
 <p><CheckCircle2 size={15}/> Matching validated addresses are reused without an automatic expiry, for saved addresses and guest checkout; exact, unchanged checkout quotes are reused until their 15-minute expiry. New addresses still need Shipbubble validation.</p>
 <a className="vn-pill" href="https://app.shipbubble.com" target="_blank" rel="noopener noreferrer">Open Shipbubble <ArrowUpRight size={15}/></a>
 <details className="vn-organized-disclosure"><summary>Pickup address & contact</summary><TerminalPickup/></details><details className="vn-organized-disclosure"><summary>Product weights & packaging</summary><ParcelProfiles/></details>
 <a className="vn-pill" href="/api/admin/bulk-dispatch">Prepare shipments</a>
 </section>;
}
