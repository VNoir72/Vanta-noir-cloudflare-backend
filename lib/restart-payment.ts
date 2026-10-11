import {getDbBinding} from './runtime-env';
import {verifyPaystackTransaction} from './paystack';
import {getOrderByReference,markOrderPaid} from './store-db';
/** Only explicit unpaid restart; late provider settlements still enter stock review. */
export async function restartPayment(customerId:string,reference:string){
 const db=getDbBinding();if(!await db.prepare('SELECT reference FROM app_customer_orders WHERE customer_id=? AND reference=?').bind(customerId,reference).first())throw Error('Order not found.');
 const order=await getOrderByReference(reference);if(!order||order.paymentStatus==='paid')throw Error('This order is already paid.');
 if(!['cancelled','expired'].includes(order.status)){
 const transaction=await verifyPaystackTransaction(reference);
 if(transaction.reference!==reference||transaction.currency!=='NGN')throw Error('Payment could not be verified.');
 if(transaction.status==='success'){await markOrderPaid({reference,amountKobo:transaction.amount,eventKey:'restart-check:'+reference,eventType:'verify.success',paymentDomain:transaction.domain,requestedAmountKobo:transaction.requested_amount,providerFeesKobo:transaction.fees});throw Error('Payment has arrived. Check your order; do not pay again.');}
 if(!['abandoned','failed','pending','pending_bank_transfer'].includes(transaction.status))throw Error('Payment is processing. Wait for confirmation before changing method.');
 }
 await db.batch([db.prepare("UPDATE orders SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE reference=? AND payment_status='pending' AND status IN ('pending_payment','payment_error')").bind(reference),db.prepare("DELETE FROM stock_reservations WHERE order_id=(SELECT id FROM orders WHERE reference=? AND status IN ('cancelled','expired') AND payment_status='pending')").bind(reference)]);
 const after=await getOrderByReference(reference);if(!after||after.paymentStatus==='paid'||!['cancelled','expired'].includes(after.status))throw Error('Order changed. Check its payment status before trying again.');
 return {restarted:true};
}
