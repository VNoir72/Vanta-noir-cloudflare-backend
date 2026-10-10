import {expireUnpaidOrders} from './order-expiry';
import {getDbBinding} from './runtime-env';
import {isPaystackConfigured,verifyPaystackTransaction} from './paystack';
import {markOrderPaid} from './store-db';
// A bounded safety net for a delayed webhook or a customer who closes the receipt page.
// Verification never initiates a charge and never treats a browser callback as proof.
export async function reconcilePendingPayments(){
 await expireUnpaidOrders();
 if(!isPaystackConfigured())return {checked:0,confirmed:0};
 const db=getDbBinding(),token=crypto.randomUUID(),now=Date.now(),key='payment-reconciliation';
 const lock=await db.prepare("INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(json_extract(store_meta.value,'$.at') AS INTEGER)<?").bind(key,JSON.stringify({at:now,token}),now-240000).run();
 if(!lock.meta.changes)return {checked:0,confirmed:0};
 const rows=await db.prepare("SELECT reference FROM orders WHERE payment_status='pending' AND status IN ('pending_payment','payment_error','expired') AND created_at>=datetime('now','-7 days') ORDER BY COALESCE((SELECT value FROM store_meta WHERE key='payment-check:'||orders.reference),'') ASC,created_at DESC LIMIT 10").all<{reference:string}>();
 let confirmed=0;
 await Promise.allSettled(rows.results.map(async({reference})=>{
  await db.prepare("INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind('payment-check:'+reference,new Date().toISOString()).run();
  let stage='provider';
  let provider:Record<string,unknown>={};
  try{const transaction=await verifyPaystackTransaction(reference);
   provider={status:transaction.status,currency:transaction.currency,amount:transaction.amount,requestedAmount:transaction.requested_amount,fees:transaction.fees,domain:transaction.domain,referenceMatches:transaction.reference===reference};
   await db.prepare("INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind('payment-diagnostic:'+reference,JSON.stringify({at:new Date().toISOString(),stage,...provider})).run();
   if(transaction.status!=='success'||transaction.currency!=='NGN'||transaction.reference!==reference||!Number.isSafeInteger(transaction.amount))return;
   stage='apply';
   await markOrderPaid({reference,amountKobo:transaction.amount,eventKey:`reconcile:${reference}`,eventType:'verify.reconciliation',paymentDomain:transaction.domain,requestedAmountKobo:transaction.requested_amount,providerFeesKobo:transaction.fees});confirmed++;
  }catch(error){
   // Private operational record; never log credentials, provider payloads or customer details.
   const message=(error instanceof Error?error.message:'Unknown verification error').replace(/(?:sk|pk)_(?:test|live)_[A-Za-z0-9]+/g,'[redacted]').slice(0,240);
   await db.prepare("INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind('payment-diagnostic:'+reference,JSON.stringify({at:new Date().toISOString(),stage,...provider,error:message})).run();
  }
 }));
 return {checked:rows.results.length,confirmed};
}
