'use client';
import {useState} from 'react';
import {allowedOrderStatuses} from '@/lib/order-status';
import {useOperationDraft} from './unsaved-changes';
export function OrderStatusEditor({reference,status,paymentStatus,onSave,busy}:{reference:string;status:string;paymentStatus:string;onSave:(reference:string,status:string)=>Promise<boolean>;busy:boolean}){
 const [next,setNext]=useState(status),[saved,setSaved]=useState(false);
 const draft=useOperationDraft(`Order ${reference}`,next,setNext,busy);
 return <div><select aria-label={`Next status for ${reference}`} className="vn-option-select" value={next} disabled={busy} onChange={e=>{setNext(e.target.value);setSaved(false);}}>{allowedOrderStatuses(status,paymentStatus).map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select><button className="vn-pill mt-2" disabled={busy||next===status} onClick={async()=>{if(await onSave(reference,next)){draft.markSaved();setSaved(true);}}}>{busy?'Updating…':'Update status'}</button><p role="status">{next!==status?'Unsaved status change':saved?'Status saved ✓':''}</p></div>;
}
