import {getDbBinding} from './runtime-env';
import {quoteDelivery,bookDelivery,refreshDeliveryTracking} from './terminal-delivery';
// An explicitly queued private sandbox fixture only. No customer order is used.
export async function runDeliveryAcceptance(){
 const db=getDbBinding(),key='terminal_delivery_acceptance';const row=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();if(!row)return;const job=JSON.parse(row.value);if(job.status!=='queued')return;
 const running=JSON.stringify({...job,status:'running',startedAt:new Date().toISOString()});const claim=await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(running,key,row.value).run();if(!claim.meta.changes)return;
 let result:Record<string,unknown>;try{
 if(job.input?.reference)throw new Error('Acceptance must use a standalone fixture.');
 let session=await quoteDelivery(job.input);const quoteCount=session.rates.length;
 if(session.stage==='quoted'){const rate=[...session.rates].sort((a,b)=>a.amountKobo-b.amountKobo)[0];session=await bookDelivery(session.id,rate.id,rate.amountKobo,true);}
 if(session.shipmentId)session=await refreshDeliveryTracking(session.id);
 result={status:session.stage==='booked'?'completed':'blocked',sessionId:session.id,quoteCount,stage:session.stage,shipmentId:session.shipmentId,tracking:session.tracking?.status,error:session.error};
 }catch{result={status:'failed',error:'Acceptance stopped. Inspect the saved sandbox session before retrying.'};}
 await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(JSON.stringify({...job,...result,finishedAt:new Date().toISOString()}),key,running).run();
}
