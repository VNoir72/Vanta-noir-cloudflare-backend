import {getDbBinding} from './runtime-env';
import {initializePaystackTransaction} from './paystack';
import {getOrderByReference} from './store-db';
// A claimed initialization is never repeated after an ambiguous timeout.
// Retrying the same reference cannot silently create another payment.
export async function startCheckoutPayment(args:{reference:string;receiptToken:string;callbackUrl:string;email:string;customerName:string}){
 const db=getDbBinding(),order=await getOrderByReference(args.reference);
 if(!order)throw new Error('Order not found.');
 const result={reference:args.reference,receiptToken:args.receiptToken};
 if(order.paymentStatus==='paid')return {...result,complete:true};
 if(order.status==='cancelled')return {...result,checking:true};
 const key='checkout-payment:'+args.reference;
 const saved=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();
 if(saved){const data=JSON.parse(saved.value);if(data.authorizationUrl)return {...result,authorizationUrl:data.authorizationUrl};return {...result,checking:true};}
 const claimed=await db.prepare('INSERT OR IGNORE INTO store_meta(key,value) VALUES(?,?)').bind(key,JSON.stringify({state:'initializing',at:new Date().toISOString()})).run();
 if(!claimed.meta.changes)return {...result,checking:true};
 try{
  const payment=await initializePaystackTransaction({email:args.email,customerName:args.customerName,reference:args.reference,amountKobo:order.totalKobo,callbackUrl:args.callbackUrl});
  if(payment.reference!==args.reference)throw new Error('Payment reference mismatch.');
  const target=new URL(payment.authorization_url);if(target.protocol!=='https:'||target.hostname!=='checkout.paystack.com')throw new Error('Invalid payment link.');
  await db.prepare('UPDATE store_meta SET value=? WHERE key=?').bind(JSON.stringify({authorizationUrl:target.href}),key).run();
  return {...result,authorizationUrl:target.href};
 }catch{
  // The provider may have accepted the request. Preserve the reference and
  // reservation; background verification can still confirm a late payment.
  return {...result,checking:true};
 }
}
