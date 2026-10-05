'use client';
import './control-center.css';
import {adminRead,hasArray} from '@/lib/admin-read';
import {formatNaira} from '@/lib/catalog';
import {useEffect,useRef,useState} from 'react';
import {useUnsavedChanges} from './unsaved-changes';
type Proposal={id:string;actor:string;action:string;status:string;created_at:string;reviewer:string;review_note:string;payload:any;before:any;result:any};
const titles:Record<string,string>={'operation:stock':'Stock adjustment',inventory:'Stock adjustment','operation:prices':'Product prices','operation:import':'Import draft products','operation:order':'Order status','operation:tracking':'Delivery tracking','operation:return':'Return update','operation:exchange':'Allocate replacements','operation:exchange-tracking':'Replacement delivery','product:create':'Create product','product:update':'Edit product','product:status':'Product visibility',upload:'Product image'};
function label(key:string){return ({id:'Record',variantId:'Variation',productId:'Product',expectedStock:'Stock at submission',stock:'Requested stock',expectedPrice:'Current price',priceKobo:'Requested price',refundKobo:'Refund amount',imageUrl:'Image',imageAlt:'Image description',details_json:'Product details'} as Record<string,string>)[key]||key.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ');}
function Value({value,field=''}:{value:any;field?:string}){
 if(value===null||value===undefined||value==='')return <span>—</span>;
 if(typeof value==='boolean')return <span>{value?'Yes':'No'}</span>;
 if(typeof value==='number'&&/kobo|expectedPrice|price_kobo/i.test(field))return <span>{formatNaira(value)}</span>;
 if(typeof value==='object')return <div className="vn-nested-fields">{Object.entries(value).map(([key,v])=><details key={key}><summary>{Array.isArray(value)?`Item ${Number(key)+1}`:label(key)}</summary><Value value={v} field={key}/></details>)}</div>;
 return <span className="vn-proposal-value">{String(value)}</span>;
}
function ChangeDetails({request:r}:{request:Proposal}){
 const entries=Object.entries(r.payload||{}),stock=['inventory','operation:stock'].includes(r.action);
 return <div className="vn-approval-details">{r.action==='upload'?<><img src={'/api/admin/approvals?image='+r.id} alt={r.payload.name} className="vn-approval-image"/><p>{r.payload.name}</p></>:<><h4>Requested change</h4>{stock?<><p>{r.before.product||'Variation'} · {r.before.color} {r.before.size}<br/>{r.before.sku||r.payload.variantId}</p><table className="vn-change-table"><thead><tr><th>Stock when submitted</th><th>Requested stock</th></tr></thead><tbody><tr><td>{r.before.stock}</td><td>{r.payload.stock}</td></tr></tbody></table><p>Reason: {r.payload.reason}</p></>:<dl>{entries.map(([key,v])=><div key={key}><dt>{Array.isArray(r.payload)?`Product ${Number(key)+1}`:label(key)}</dt><dd><Value value={v} field={key}/></dd></div>)}</dl>}{!stock&&r.before!==null&&<details><summary>Values when submitted</summary><Value value={r.before}/></details>}</>}{r.result&&<details><summary>Applied result</summary><Value value={r.result}/></details>}</div>;
}
export function ApprovalsPanel({owner=false,onChanged}:{owner?:boolean;onChanged?:()=>Promise<void>}){
 const [requests,setRequests]=useState<Proposal[]>([]),[status,setStatus]=useState(owner?'pending':'all'),[page,setPage]=useState(1),[more,setMore]=useState(false),[pending,setPending]=useState(0),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(false),[busy,setBusy]=useState(''),[notes,setNotes]=useState<Record<string,string>>({});
 const serial=useRef(0),lock=useRef(false);
 useUnsavedChanges({name:'Approval review',dirty:Object.values(notes).some(Boolean),busy:!!busy,discard:()=>setNotes({})});
 async function load(){const n=++serial.current;setLoading(true);setError('');try{const v=await adminRead<{requests:Proposal[];hasMore:boolean;pending:number}>('/api/admin/approvals?'+new URLSearchParams({status,page:String(page)}),hasArray('requests'));if(n!==serial.current)return;setRequests(v.requests);setMore(v.hasMore);setPending(v.pending);}catch(e){if(n===serial.current)setError((e as Error).message);}finally{if(n===serial.current)setLoading(false);}}
 useEffect(()=>{void load();return()=>{serial.current++;};},[status,page]);
 async function review(r:Proposal,decision:'approve'|'reject'){
  if(lock.current)return;lock.current=true;setBusy(r.id);setError('');setNotice('');
  try{const response=await fetch('/api/admin/approvals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:r.id,decision,note:notes[r.id]||''}),signal:AbortSignal.timeout(60000)});const v=await response.json() as {status:string;error?:string};if(!response.ok)throw new Error(v.error||'Request failed.');
   setNotes(n=>({...n,[r.id]:''}));await load();setNotice(v.status==='approved'?'Approved and applied.':v.status==='rejected'?'Rejected. No live changes were made.':v.status==='conflict'?'The record changed after submission. Staff must submit a fresh request.':'This request needs review. Check its result and the live record before making further changes.');
   if(v.status==='approved'||v.status==='review')try{await onChanged?.();}catch{setNotice('Review recorded. Refresh the dashboard to update its figures.');}
  }catch(e){setError((e as Error).message+' Refresh the queue before retrying.');}finally{lock.current=false;setBusy('');}
 }
 return <section className="vn-control-panel vn-approvals"><div className="vn-approval-heading"><div><h2>{owner?'Staff approvals':'My requests'}</h2><p>{owner?`${pending} waiting for your decision. Review each change before it goes live.`:'Your changes stay pending until the store owner approves them.'}</p></div><button className="vn-pill" disabled={loading||!!busy} onClick={()=>void load()}>Refresh requests</button></div>
 <label className="vn-approval-filter">Show <select value={status} disabled={!!busy} onChange={e=>{setStatus(e.target.value);setPage(1);}}>{['pending','approved','rejected','conflict','review','applying','all'].map(s=><option key={s} value={s}>{s==='review'?'Needs review':s[0].toUpperCase()+s.slice(1)}</option>)}</select></label>
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{loading&&<p role="status">Loading requests…</p>}{!loading&&!error&&!requests.length&&<p className="ops-empty">No {status==='all'?'':status} requests.</p>}
 {requests.map(r=><article key={r.id} className="vn-approval-card"><header><div><h3>{titles[r.action]||r.action}</h3><p>{r.actor} · {r.created_at} UTC</p></div><span className={'vn-status status-'+r.status}>{r.status==='review'?'Needs review':r.status}</span></header><details><summary>Review change</summary><ChangeDetails request={r}/>{r.review_note&&<p className="vn-review-note">{r.review_note}</p>}{r.reviewer&&<p>Reviewed by {r.reviewer}</p>}{r.status==='applying'&&<p>Application started. If this remains here, check the live record before taking any further action. It will not be automatically retried.</p>}{owner&&r.status==='pending'&&<div className="vn-review-actions"><label>Note to staff (optional)<textarea maxLength={1000} value={notes[r.id]||''} disabled={!!busy} onChange={e=>setNotes({...notes,[r.id]:e.target.value})}/></label><div><button className="vn-pill" disabled={!!busy} onClick={()=>void review(r,'reject')}>Reject</button><button className="vn-pill vn-approve-button" disabled={!!busy} onClick={()=>void review(r,'approve')}>{busy===r.id?'Applying decision…':'Approve and apply'}</button></div></div>}</details></article>)}
 <div className="vn-overview-tools"><button disabled={loading||!!busy||page===1} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page}</span><button disabled={loading||!!busy||!more} onClick={()=>setPage(page+1)}>Next</button></div></section>;
}
