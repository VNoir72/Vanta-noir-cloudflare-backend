"use client";
import {useEffect,useState,useRef} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Mail,RefreshCw,ArrowRight,Send} from 'lucide-react';
import {DashboardInfo} from './dashboard-info';
type Email={id:string;eventKey:string;recipient:string;status:string;deliveryStatus:string|null;lastError:string;createdAt:string;sentAt:string|null};
type Tracking={connected:boolean;state:string;message:string;endpoint:string;lastEventAt:string|null};
type Data={emails:Email[];tracking:Tracking};
const problem=(e:Email)=>['bounced','failed','complained','suppressed','delivery_delayed'].includes(e.deliveryStatus||'')||e.status==='review'||(e.status==='pending'&&!!e.lastError);
const labels:Record<string,string>={delivered:'Delivered to recipient’s mail server',delivery_delayed:'Delivery delayed',bounced:'Bounced — check the address',failed:'Delivery failed',complained:'Marked as spam — contact customer before resending',suppressed:'Blocked by Resend — check suppression details'};
export function EmailDeliveryPanel({open=false,onOpenChange,onSummary}:{open?:boolean;onOpenChange?:(open:boolean)=>void;onSummary?:(count:number)=>void}={}){
 const setupLock=useRef(false),summaryCallback=useRef(onSummary);summaryCallback.current=onSummary;
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[query,setQuery]=useState(''),[filter,setFilter]=useState(''),[reload,setReload]=useState(0),[busy,setBusy]=useState(false),[secret,setSecret]=useState(''),[loading,setLoading]=useState(false),[lastChecked,setLastChecked]=useState<Date|null>(null);
 useEffect(()=>{
  const controller=new AbortController();let inFlight=false;
  const load=async()=>{
   if(inFlight||controller.signal.aborted)return;inFlight=true;setLoading(true);setError('');
   const request=new AbortController(),abort=()=>request.abort();controller.signal.addEventListener('abort',abort,{once:true});
   const timeout=setTimeout(()=>request.abort(),15000);
   try{
    const r=await fetch('/api/admin/email-delivery?reference='+encodeURIComponent(filter),{cache:'no-store',signal:request.signal});
    const payload=await r.json() as Data&{error?:string};if(!r.ok)throw new Error(payload.error||'Order email status could not load.');if(!Array.isArray(payload.emails)||!payload.tracking)throw new Error('Email status returned incomplete data. Please retry.');
    if(!controller.signal.aborted){setData(payload);setLastChecked(new Date());summaryCallback.current?.(payload.emails.filter(problem).length);}
   }catch(e){if(!controller.signal.aborted)setError(request.signal.aborted?'The email-status request timed out. Tap Show recent / refresh to try again.':e instanceof Error?e.message:'Order email status unavailable.');}
   finally{clearTimeout(timeout);controller.signal.removeEventListener('abort',abort);inFlight=false;if(!controller.signal.aborted)setLoading(false);}
  };
  void load();const timer=setInterval(()=>{if(!document.hidden)void load();},60000);
  return()=>{controller.abort();clearInterval(timer);};
 },[filter,reload]);
 function refreshRecent(){setLoading(true);setError('');setQuery('');setFilter('');setReload(n=>n+1);}

 async function setup(body:unknown){if(setupLock.current)return;setupLock.current=true;setBusy(true);setError('');try{const r=await fetch('/api/admin/email-delivery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const p=await r.json() as {error?:string};if(!r.ok)throw new Error(p.error||'Connection could not complete.');setSecret('');setReload(n=>n+1);}catch(e){setError(e instanceof Error?e.message:'Connection could not complete.');}finally{setupLock.current=false;setBusy(false);}}
 const content=<>
 <p>Only you can resend confirmations. Delivered means the recipient’s mail server accepted the email; it does not guarantee inbox placement or that it was read.</p>
 {error&&<p role="alert">{error}</p>}{!data&&<button type="button" disabled={loading} onClick={refreshRecent}>{loading?'Loading order emails…':'Retry loading order emails'}</button>}{message&&<p role="status">{message}</p>}
 {data&&<><p>{data.tracking.connected?(data.tracking.lastEventAt?'Delivery tracking is receiving signed Resend updates.':'Tracking is configured; waiting for the first signed Resend update.'):'Delivery tracking needs one connection step. Sending order emails still works.'}</p>
 {!data.tracking.connected&&<details><summary>Connect delivery tracking</summary><p>{data.tracking.message}</p><button disabled={busy} onClick={()=>void setup({action:'connect'})}>Try automatic connection</button><p>If your existing key only allows sending, open <a href="https://resend.com/webhooks" target="_blank" rel="noreferrer">Resend → Webhooks</a>, add this endpoint, and select email.delivered, email.delivery_delayed, email.bounced, email.failed, email.complained and email.suppressed.</p><code>{data.tracking.endpoint||'Endpoint is not configured.'}</code><form onSubmit={e=>{e.preventDefault();void setup({action:'secret',secret});}}><label>Webhook signing secret<input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)} placeholder="whsec_…" required/></label><button disabled={busy||!secret}>Save signing secret</button></form><p>Use the webhook signing secret here, not your Resend API key. Do not paste it into chat.</p></details>}
 <form aria-busy={loading} onSubmit={e=>{e.preventDefault();setLoading(true);setError('');setFilter(query.trim().toUpperCase());setReload(n=>n+1);}}><label>Find order email<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="VN-…"/></label><button type="submit" disabled={loading}>Find</button><button type="button" disabled={loading} onClick={refreshRecent}>{loading?'Refreshing…':'Show recent / refresh'}</button></form>
 <p role="status" aria-live="polite">{loading?'Checking order email statuses…':!error&&lastChecked?`Updated at ${lastChecked.toLocaleTimeString()} · ${data.emails.length} email${data.emails.length===1?'':'s'} shown.`:''}</p>
 {!data.emails.length&&<p>No confirmation emails match. Payment must be verified before a confirmation can be sent.</p>}
 <ul>{data.emails.map(email=><EmailRow key={email.id} email={email} onQueued={()=>{setMessage('Confirmation queued. It will send on the next scheduled email cycle, usually within five minutes.');setReload(n=>n+1);}}/>)}</ul></>}
 </>;
 if(!onOpenChange)return <details className="vn-email-panel"><summary>Order emails · {data?data.emails.filter(problem).length:'…'} recent delivery problems</summary>{content}</details>;
 return <><section className="vn-glass vn-email-summary"><div className="vn-exact-card-head"><h2>Order email delivery <DashboardInfo title="Order email delivery">Delivery confirms acceptance by the recipient’s mail server, not inbox placement or reading. Open recent emails to inspect individual messages or request a resend.</DashboardInfo></h2></div><p><Mail size={20}/>{error?'Status unavailable':data?`${data.emails.filter(problem).length} recent delivery issues`:'Checking delivery…'}<i className={data&&!error&&!data.emails.some(problem)?'is-ok':''}/></p><div className="vn-email-summary-actions"><button className="vn-small-button" onClick={()=>{onOpenChange(true);refreshRecent();}}><RefreshCw size={15}/> Show recent</button><button className="vn-small-button" onClick={()=>onOpenChange(true)}><Send size={15}/> Resend confirmation <ArrowRight size={14}/></button></div></section><Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="vn-email-dialog"><DialogTitle>Order emails</DialogTitle><DialogDescription>Inspect delivery status and resend a confirmation only when the customer requests it.</DialogDescription><div className="vn-email-panel">{content}</div></DialogContent></Dialog></>;
}
function EmailRow({email:e,onQueued}:{email:Email;onQueued:()=>void}){
 const [editing,setEditing]=useState(false),[recipient,setRecipient]=useState(e.recipient),[confirmed,setConfirmed]=useState(false),[requestId,setRequestId]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const reference=e.eventKey.split(':')[1],resendLock=useRef(false);
 async function resend(){if(resendLock.current)return;resendLock.current=true;setBusy(true);setError('');try{const r=await fetch('/api/admin/email-delivery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'resend',reference,recipient,requestId,confirmed}),signal:AbortSignal.timeout(20000)});const p=await r.json() as {error?:string};if(!r.ok)throw new Error(p.error||'Could not queue the confirmation.');setEditing(false);onQueued();}catch(cause){setError(cause instanceof Error?cause.message:'Please retry.');}finally{resendLock.current=false;setBusy(false);}}
 return <li className={problem(e)?'has-problem':''}><strong>{reference}</strong><p>{e.recipient} · {e.deliveryStatus?labels[e.deliveryStatus]:e.status==='sent'?'Accepted by Resend — delivery not confirmed':e.status==='review'?'Sending needs review':e.status==='pending'?'Queued for sending':e.status==='sending'?'Sending':e.status}</p>{e.lastError&&<p>{e.lastError}</p>}<p>{new Date(e.createdAt.replace(' ','T')+'Z').toLocaleString()}</p>
 <button disabled={busy||['pending','sending'].includes(e.status)} onClick={()=>{setEditing(true);setConfirmed(false);setRecipient(e.recipient);setRequestId(crypto.randomUUID());setError('');}}>Resend confirmation</button>
 {editing&&<form onSubmit={event=>{event.preventDefault();void resend();}}><label>Recipient email<input type="email" value={recipient} onChange={event=>setRecipient(event.target.value)} required maxLength={200}/></label><label className="vn-email-confirm"><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)} required/>I confirmed this address with the customer and they requested another copy.</label><p>This sends order details to the address above. It does not change the checkout address. For a bounce or spam complaint, resolve the delivery problem before sending again.</p>{error&&<p role="alert">{error}</p>}<button disabled={busy||!confirmed}>{busy?'Queueing…':'Send this confirmation'}</button><button type="button" disabled={busy} onClick={()=>setEditing(false)}>Cancel</button></form>}
 </li>;
}
