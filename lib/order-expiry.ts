import {getDbBinding} from './runtime-env';
/** Expiry ends an unpaid order; a later verified payment is still reconciled for owner review. */
export async function expireUnpaidOrders(reference?:string){
 const db=getDbBinding();
 const scope=reference?' AND reference=?':'';
 const update=db.prepare(`UPDATE orders SET status='expired',updated_at=CURRENT_TIMESTAMP
 WHERE payment_status='pending' AND status IN ('pending_payment','payment_error')
 AND julianday(COALESCE((SELECT json_extract(value,'$.transfer.expiresAt') FROM store_meta WHERE key='checkout-payment:'||orders.reference),datetime(created_at,'+15 minutes')))<=julianday('now')${scope}`);
 await db.batch([reference?update.bind(reference):update,
 db.prepare("DELETE FROM stock_reservations WHERE order_id IN (SELECT id FROM orders WHERE status='expired' AND payment_status='pending')")]);
}
