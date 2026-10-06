import {z} from 'zod';
import {getDbBinding} from './runtime-env';
import {type StaffRole} from './operations-permissions';

export class SaleInputError extends Error {}
type Identity={email:string;role:StaffRole};
export const canSell=(role:StaffRole)=>role==='owner'||role==='sales';
const saleSchema=z.object({
 clientId:z.string().uuid(),
 items:z.array(z.object({variantId:z.string().min(1).max(160),quantity:z.number().int().min(1).max(100),expectedPriceKobo:z.number().int().min(100)}).strict()).min(1).max(20),
 paymentMethod:z.enum(['cash','transfer','card']),paymentReference:z.string().trim().max(160).default(''),customer:z.string().trim().max(200).default('')
}).strict().superRefine((v,c)=>{
 if(new Set(v.items.map(i=>i.variantId)).size!==v.items.length)c.addIssue({code:'custom',message:'Combine quantities for the same size and colour.'});
 if(v.paymentMethod!=='cash'&&!v.paymentReference)c.addIssue({code:'custom',message:'Enter the transfer or card terminal reference.'});
});
export async function salesData(auth:Identity,params:URLSearchParams){
 auth={...auth,email:auth.email.trim().toLowerCase()};
 if(!canSell(auth.role))throw new SaleInputError('Sales access denied.');
 const db=getDbBinding(),q='%'+(params.get('q')||'').slice(0,100)+'%',page=Math.max(1,Math.min(10000,Math.floor(Number(params.get('page'))||1)));
 const [variants,sales,pending]=await Promise.all([
 db.prepare(`SELECT v.id,v.sku,v.color,v.size,p.name,p.category,p.price_kobo AS priceKobo,v.stock,
 COALESCE((SELECT SUM(quantity) FROM stock_reservations r WHERE r.variant_id=v.id AND expires_at>CURRENT_TIMESTAMP),0) AS reserved
 FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.active=1 AND p.active=1 AND p.status='published' AND (p.name LIKE ? OR v.sku LIKE ?) ORDER BY p.name,v.color,v.size LIMIT 101`).bind(q,q).all(),
 db.prepare(`SELECT o.reference,o.total_kobo AS totalKobo,o.created_at AS createdAt,w.actor,w.payment_method AS paymentMethod,w.customer,a.id AS approvalId,a.status,a.review_note AS reviewNote,a.payload_json AS details
 FROM walk_in_sales w JOIN orders o ON o.id=w.order_id JOIN admin_approvals a ON a.id=w.approval_id WHERE (?='owner' OR w.actor=?) ORDER BY o.created_at DESC,o.id DESC LIMIT 26 OFFSET ?`).bind(auth.role,auth.email,(page-1)*25).all(),
 db.prepare(`SELECT COUNT(*) AS count FROM walk_in_sales w JOIN admin_approvals a ON a.id=w.approval_id WHERE a.status='pending' AND (?='owner' OR w.actor=?)`).bind(auth.role,auth.email).first<{count:number}>()
 ]);
 return {variants:variants.results.slice(0,100).map((v:any)=>({...v,available:Math.max(0,v.stock-v.reserved)})),moreVariants:variants.results.length>100,sales:sales.results.slice(0,25).map((s:any)=>({...s,details:JSON.parse(s.details)})),hasMore:sales.results.length>25,pending:pending?.count||0};
}

export async function submitSale(auth:Identity,input:unknown){
 auth={...auth,email:auth.email.trim().toLowerCase()};
 if(!canSell(auth.role))throw new SaleInputError('Sales access denied.');
 const v=saleSchema.parse(input),db=getDbBinding(),canonical=JSON.stringify(v);
 const existing=async()=>db.prepare(`SELECT w.request_json,a.id,a.status,o.reference FROM walk_in_sales w JOIN admin_approvals a ON a.id=w.approval_id JOIN orders o ON o.id=w.order_id WHERE w.actor=? AND w.client_id=?`).bind(auth.email,v.clientId).first<{request_json:string;id:string;status:string;reference:string}>();
 const reused=await existing();if(reused){if(reused.request_json!==canonical)throw new SaleInputError('This sale was already submitted with different details. Refresh sales history.');return reused;}
 const items=[];
 for(const item of v.items){
  const row=await db.prepare(`SELECT v.id AS variantId,p.id AS productId,p.name AS productName,v.color,v.size,v.sku,p.price_kobo AS unitPriceKobo FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id=? AND v.active=1 AND p.active=1 AND p.status='published'`).bind(item.variantId).first<{variantId:string;productId:string;productName:string;color:string;size:string;sku:string;unitPriceKobo:number}>();
  if(!row||row.unitPriceKobo!==item.expectedPriceKobo)throw new SaleInputError('Product availability or price changed. Refresh and select it again.');
  items.push({...row,quantity:item.quantity,lineTotalKobo:item.quantity*row.unitPriceKobo});
 }
 const total=items.reduce((s,i)=>s+i.lineTotalKobo,0),orderId=crypto.randomUUID(),approvalId=crypto.randomUUID(),reference='VN-WALK-'+crypto.randomUUID().toUpperCase();
 const payload=JSON.stringify({orderId,reference,items,totalKobo:total,paymentMethod:v.paymentMethod,paymentReference:v.paymentReference,customer:v.customer});
 const gate='EXISTS(SELECT 1 FROM orders WHERE id=?)';
 // D1 batches are atomic. Check price, staff access and ALL requested stock again inside the write.
 const statements=[db.prepare(`INSERT INTO orders(id,reference,email,first_name,last_name,phone,address_line_1,city,state,subtotal_kobo,total_kobo,status,payment_status)
 SELECT ?,?,'',?,'','','Walk-in collection','','',?,?,'walk_in_pending','manual_pending'
 WHERE NOT EXISTS(SELECT 1 FROM walk_in_sales WHERE actor=? AND client_id=?)
 AND (?='owner' OR EXISTS(SELECT 1 FROM admin_staff WHERE email=? AND active=1 AND role='sales'))
 AND NOT EXISTS(SELECT 1 FROM json_each(?) i LEFT JOIN product_variants pv ON pv.id=json_extract(i.value,'$.variantId') LEFT JOIN products p ON p.id=pv.product_id
 WHERE pv.id IS NULL OR pv.active<>1 OR p.active<>1 OR p.status<>'published' OR p.price_kobo<>json_extract(i.value,'$.expectedPriceKobo') OR pv.stock-COALESCE((SELECT SUM(quantity) FROM stock_reservations WHERE variant_id=pv.id AND expires_at>CURRENT_TIMESTAMP),0)<json_extract(i.value,'$.quantity'))`).bind(orderId,reference,v.customer||'Walk-in customer',total,total,auth.email,v.clientId,auth.role,auth.email,JSON.stringify(v.items)),
 db.prepare(`INSERT INTO admin_approvals(id,actor,role,action,request_hash,payload_json,baseline_json) SELECT ?,?,?,'walk-in-sale',?,?,'null' WHERE ${gate}`).bind(approvalId,auth.email,auth.role,'walk-in:'+v.clientId,payload,orderId),
 db.prepare(`INSERT INTO walk_in_sales(order_id,actor,client_id,request_json,payment_method,payment_reference,customer,approval_id) SELECT ?,?,?,?,?,?,?,? WHERE ${gate}`).bind(orderId,auth.email,v.clientId,canonical,v.paymentMethod,v.paymentReference,v.customer,approvalId,orderId)];
 for(const i of items)statements.push(
 db.prepare(`INSERT INTO order_items(order_id,product_id,variant_id,product_name,size,color,quantity,unit_price_kobo,line_total_kobo) SELECT ?,?,?,?,?,?,?,?,? WHERE ${gate}`).bind(orderId,i.productId,i.variantId,i.productName,i.size,i.color,i.quantity,i.unitPriceKobo,i.lineTotalKobo,orderId),
 db.prepare(`INSERT INTO stock_reservations(id,order_id,variant_id,quantity,expires_at) SELECT ?,?,?,?,'9999-12-31 23:59:59' WHERE ${gate}`).bind(crypto.randomUUID(),orderId,i.variantId,i.quantity,orderId));
 statements.push(db.prepare(`INSERT INTO admin_audit(actor,action,entity,detail) SELECT ?,'walk-in sale submitted',?,? WHERE ${gate}`).bind(auth.email,reference,'Stock reserved; awaiting owner approval',orderId));
 await db.batch(statements);
 const stored=await existing();if(!stored)throw new SaleInputError('Insufficient available stock or access changed. Refresh before submitting.');
 if(stored.request_json!==canonical)throw new SaleInputError('This sale was already submitted with different details. Refresh sales history.');
 return {id:stored.id,status:stored.status,reference:stored.reference};
}

export async function reviewSale(auth:Identity,id:string,decision:'approve'|'reject',note:string){
 if(auth.role!=='owner')throw new SaleInputError('Only the owner can review sales.');
 const db=getDbBinding(),token=crypto.randomUUID(),key='walk-in-review:'+id;
 const gate='EXISTS(SELECT 1 FROM store_meta WHERE key=? AND value=?)';
 const stmts=[db.prepare(`INSERT INTO store_meta(key,value) SELECT ?,? WHERE EXISTS(SELECT 1 FROM admin_approvals a JOIN walk_in_sales w ON w.approval_id=a.id JOIN orders o ON o.id=w.order_id WHERE a.id=? AND a.status='pending' AND o.status='walk_in_pending'
 AND (?='reject' OR (a.role='owner' OR EXISTS(SELECT 1 FROM admin_staff WHERE email=a.actor AND role='sales' AND active=1)) AND NOT EXISTS(SELECT 1 FROM order_items i WHERE i.order_id=o.id AND (NOT EXISTS(SELECT 1 FROM stock_reservations r WHERE r.order_id=o.id AND r.variant_id=i.variant_id AND r.quantity=i.quantity AND r.expires_at>CURRENT_TIMESTAMP) OR NOT EXISTS(SELECT 1 FROM product_variants pv WHERE pv.id=i.variant_id AND pv.stock>=COALESCE((SELECT SUM(quantity) FROM stock_reservations WHERE variant_id=pv.id AND expires_at>CURRENT_TIMESTAMP),0)))))) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).bind(key,token,id,decision)];
 if(decision==='approve')stmts.push(
 db.prepare(`INSERT INTO stock_adjustments(variant_id,old_stock,new_stock,reason,actor) SELECT pv.id,pv.stock,pv.stock-i.quantity,'Walk-in sale '||o.reference,? FROM order_items i JOIN product_variants pv ON pv.id=i.variant_id JOIN orders o ON o.id=i.order_id JOIN walk_in_sales w ON w.order_id=o.id WHERE w.approval_id=? AND ${gate}`).bind(auth.email,id,key,token),
 db.prepare(`UPDATE product_variants SET stock=stock-(SELECT i.quantity FROM order_items i JOIN walk_in_sales w ON w.order_id=i.order_id WHERE w.approval_id=? AND i.variant_id=product_variants.id),updated_at=CURRENT_TIMESTAMP WHERE id IN (SELECT i.variant_id FROM order_items i JOIN walk_in_sales w ON w.order_id=i.order_id WHERE w.approval_id=?) AND ${gate}`).bind(id,id,key,token));
 stmts.push(
 db.prepare(`UPDATE orders SET status=?,payment_status=?,paid_at=CASE WHEN ?='approve' THEN CURRENT_TIMESTAMP ELSE NULL END,updated_at=CURRENT_TIMESTAMP WHERE id=(SELECT order_id FROM walk_in_sales WHERE approval_id=?) AND ${gate}`).bind(decision==='approve'?'delivered':'cancelled',decision==='approve'?'paid':'cancelled',decision,id,key,token),
 db.prepare(`DELETE FROM stock_reservations WHERE order_id=(SELECT order_id FROM walk_in_sales WHERE approval_id=?) AND ${gate}`).bind(id,key,token),
 db.prepare(`UPDATE admin_approvals SET status=?,reviewer=?,review_note=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=? AND ${gate}`).bind(decision==='approve'?'approved':'rejected',auth.email,note,id,key,token),
 db.prepare(`INSERT INTO admin_audit(actor,action,entity,detail) SELECT ?,?,?,? WHERE ${gate}`).bind(auth.email,'walk-in sale '+decision,id,note,key,token),
 db.prepare('DELETE FROM store_meta WHERE key=? AND value=?').bind(key,token));
 const result=await db.batch(stmts);if(!result[0].meta.changes)throw new SaleInputError('Already reviewed, staff access changed, or reserved stock needs review. Refresh; reject to release a pending sale.');
 return {status:decision==='approve'?'approved':'rejected'};
}
