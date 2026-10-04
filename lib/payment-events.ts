import {getDbBinding,runtimeEnv} from './runtime-env';
import {receiptDigest} from './receipt-access';
import {queueEmail} from './commerce-db';
const supported=new Set(['refund.pending','refund.processing','refund.needs-attention','refund.processed','refund.failed','charge.dispute.create','charge.dispute.remind','charge.dispute.resolve']);
export async function recordPaymentUpdate(event:string,data:Record<string,unknown>){
 if(!supported.has(event))return false;
 const transaction=data.transaction&&typeof data.transaction==='object'?data.transaction as Record<string,unknown>:{};
 const reference=String(data.transaction_reference||transaction.reference||'').slice(0,120);
 const amount=Number(data.amount??data.refund_amount);
 const update={event,reference,providerId:String(data.id||data.refund_reference||'').slice(0,160),amountKobo:Number.isSafeInteger(amount)&&amount>=0?amount:null,currency:typeof data.currency==='string'?data.currency.slice(0,8):'',providerStatus:typeof data.status==='string'?data.status.slice(0,80):'',resolution:typeof data.resolution==='string'?data.resolution.slice(0,80):''};
 const digest=await receiptDigest(JSON.stringify(update)),db=getDbBinding();
 const known=reference?await db.prepare('SELECT id FROM orders WHERE reference=?').bind(reference).first():null;
 await db.prepare('INSERT OR IGNORE INTO store_meta(key,value) VALUES(?,?)').bind('payment-update:'+digest,JSON.stringify({...update,matched:!!known,receivedAt:new Date().toISOString()})).run();
 // Always retry queuing after duplicate delivery: storage may have committed
 // before an earlier email queue failure. The outbox key prevents duplicates.
 const owner=runtimeEnv().ADMIN_EMAIL?.trim();
 if(owner)await queueEmail('payment-update:'+digest,owner,`Paystack ${event} · ${reference||'unmatched transaction'}`,`Paystack reported ${event}.\nOrder: ${reference||'Not supplied; review Paystack'}\nProvider reference: ${update.providerId||'Not supplied'}\nStatus: ${update.providerStatus||event}\nOpen Paystack to review the refund or dispute and its deadline. Open Store admin for the order. No refund, stock adjustment or fulfilment action was initiated by this notification.`);
 return true;
}
export async function recentPaymentUpdates(){
 const rows=await getDbBinding().prepare("SELECT value FROM store_meta WHERE key >= 'payment-update:' AND key < 'payment-update;' ORDER BY json_extract(value,'$.receivedAt') DESC LIMIT 30").all<{value:string}>();
 return rows.results.map(row=>JSON.parse(row.value));
}
