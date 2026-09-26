"use client";
import '../merchandising.css';
import {useEffect,useRef,useState} from 'react';
import type {AdminProduct} from '@/lib/store-db';
import type {SalesSignal} from '@/lib/merchandising';
type ReleaseData={campaigns:Array<{productId:string;startedAt:string}>;sales:SalesSignal[]};
export function ReleasePanel({products}:{products:AdminProduct[]}) {
  const [data,setData]=useState<ReleaseData|null>(null),[id,setId]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const sending=useRef(false);
  async function load(){try{const r=await fetch('/api/admin/releases',{cache:'no-store',signal:AbortSignal.timeout(15000)});const d=await r.json() as ReleaseData&{error?:string};if(!r.ok)throw Error(d.error||'Release tools unavailable.');setData(d);setError('');}catch(e){setError(e instanceof Error?e.message:'Release tools unavailable.');}}
  useEffect(()=>{void load();},[]);
  const announced=Boolean(data?.campaigns.some(c=>c.productId===id));
  async function send(){if(sending.current||!confirmed||!id)return;sending.current=true;setBusy(true);setError('');setMessage('');try{const r=await fetch('/api/admin/releases',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),body:JSON.stringify({productId:id,confirmed:true})});const d=await r.json() as {created?:boolean;error?:string};if(!r.ok)throw Error(d.error||'Announcement failed.');setMessage(d.created?'Release scheduled for confirmed subscribers. Check customer email delivery for progress.':'This release was already announced. It will not be sent twice.');setConfirmed(false);await load();}catch(e){setError(e instanceof Error?e.message:'Could not announce the release.');}finally{sending.current=false;setBusy(false);}}
  return <details className="vn-control-panel vn-release-admin"><summary>Homepage releases &amp; best sellers</summary>
    <p>Use a product’s Featured switch for Featured Pieces. Set its release date for New Arrivals (30 days). Previews appear in Coming Soon. Publishing does not send emails automatically.</p>
    {error&&<p role="alert">{error} <button type="button" onClick={load}>Retry loading</button></p>}
    {data&&<><h3>Announce one release</h3><p>This sends one email per confirmed address on the existing collection-news list or this product’s release list. The store must be open and the product published with an approved price and available stock. This action cannot recall email already sent.</p>
      <label>Product<select value={id} onChange={e=>{setId(e.target.value);setConfirmed(false);setMessage('');}}><option value="">Choose a release</option>{products.filter(p=>p.status==='published').map(p=><option key={p.id} value={p.id}>{p.name} · {p.id}</option>)}</select></label>
      {announced?<p>This product has already been announced.</p>:<><label className="vn-launch-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I checked this product and want to email its confirmed audience now.</label><button type="button" className="vn-pill" disabled={!id||!confirmed||busy} onClick={send}>{busy?'Scheduling…':'Announce release'}</button></>}
      {message&&<p role="status">{message}</p>}<h3>Verified live sales · 30 days</h3><p>Historical orders with unknown payment mode, test payments, cancellations and stock-review orders are excluded. Recorded refunded quantities are deducted. Selling Fast requires at least 5 units across 3 orders in 7 days, with no more than a week’s stock remaining at that pace.</p>
      <div className="overflow-x-auto"><table className="vn-data-table"><thead><tr><th>Product</th><th>Units / 7 days</th><th>Units / 30 days</th><th>Orders / 30 days</th></tr></thead><tbody>{data.sales.slice(0,30).map(s=><tr key={s.productId}><td>{products.find(p=>p.id===s.productId)?.name||s.productId}</td><td>{s.units7}</td><td>{s.units30}</td><td>{s.orders30}</td></tr>)}</tbody></table></div>{!data.sales.length&&<p>No eligible live sales yet. The homepage will not claim any best sellers.</p>}</>}
  </details>;
}
