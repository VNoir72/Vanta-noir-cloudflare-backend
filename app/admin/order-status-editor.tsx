'use client';
import {allowedOrderStatuses} from '@/lib/order-status';
import {RecordEditor} from './record-editor';
export function OrderStatusEditor({reference,status,paymentStatus,onSave,busy}:{reference:string;status:string;paymentStatus:string;onSave:(reference:string,status:string)=>Promise<boolean>;busy:boolean}){
 const allowed=allowedOrderStatuses(status,paymentStatus);
 return <RecordEditor name={'Order status '+reference} initialValue={status} busy={busy} onSave={next=>onSave(reference,next)}>{(next,setNext)=><select aria-label={'Next status for '+reference} className="vn-option-select" value={next} onChange={e=>setNext(e.target.value)}>{[...new Set([status,...allowed])].map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select>}</RecordEditor>;
}
