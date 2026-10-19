'use client';
import {useCallback,useEffect,useState} from 'react';
import type {customerAccountAccess} from '@/lib/customer-access';
type Access=Awaited<ReturnType<typeof customerAccountAccess>>;
export function CustomerAccountAccess({email}:{email:string}){
 const [access,setAccess]=useState<Access|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[action,setAction]=useState<'suspend'|'restore'|null>(null),[reason,setReason]=useState('');
 const load=useCallback(async()=>{
  const response=await fetch('/api/admin/customer-access?'+new URLSearchParams({email}),{cache:'no-store'});
  const data=await response.json() as Access&{error?:string};
  if(!response.ok)throw Error(data.error||'Account access unavailable.');
  return data;
 },[email]);
 useEffect(()=>{let live=true;void load().then(data=>{if(live)setAccess(data);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[load]);
 async function refresh(){setBusy(true);setError('');try{setAccess(await load());setAction(null);setReason('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function save(){
  if(!access||!action||busy)return;
  setBusy(true);setError('');setMessage('');
  try{
   const response=await fetch('/api/admin/customer-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,version:access.version,action,reason:reason.trim()})});
   const data=await response.json() as Access&{error?:string};
   if(!response.ok)throw Error(data.error||'Account access could not be updated. Reload status before retrying.');
   setAccess(data);setAction(null);setReason('');setMessage(data.status==='suspended'?'Store account suspended. Existing store sessions were revoked.':'Store account restored. The customer must sign in again.');
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section className="vn-customer-notes" aria-label="Customer account access"><h4>Store account access</h4>
  {!access&&!error&&<p role="status">Loading account access…</p>}
  {access&&<><p><strong>{!access.registered?'No registered store account':access.status==='suspended'?'Suspended':'Active'}</strong></p>
   <p>Suspension blocks website and app account access and new checkout using this email. It preserves orders, payments and receipts. Restoration requires a fresh sign-in.</p>
   {access.updatedAt&&<p>Last action: {new Date(access.updatedAt).toLocaleString()} · {access.updatedBy}<br/>Reason: {access.reason}</p>}
   {access.registered&&!action&&<button className="vn-pill" disabled={busy} onClick={()=>{setAction(access.status==='suspended'?'restore':'suspend');setMessage('');setError('');}}>{access.status==='suspended'?'Restore account':'Suspend account'}</button>}
   {action&&<form onSubmit={e=>{e.preventDefault();void save();}}><fieldset className="vn-customer-edit" disabled={busy}><legend>{action==='suspend'?'Confirm account suspension':'Confirm account restoration'}</legend><p>{email}</p><label>Reason for {action==='suspend'?'suspension':'restoration'}<textarea required minLength={5} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><p>This action and your reason will be recorded in the administrator audit log.</p><div className="vn-auto-actions"><button className="vn-pill" type="submit" disabled={busy||reason.trim().length<5}>{busy?'Saving…':action==='suspend'?'Confirm suspension':'Confirm restoration'}</button><button className="vn-pill" type="button" disabled={busy} onClick={()=>{setAction(null);setReason('');}}>Cancel</button></div></fieldset></form>}
  </>}
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  <button className="vn-pill" disabled={busy} onClick={()=>void refresh()}>Reload access status</button>
 </section>;
}
