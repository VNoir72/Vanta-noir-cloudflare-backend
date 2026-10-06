import {reviewSale} from './walk-in-sales';
import {z} from 'zod';
import {getDbBinding,runtimeEnv} from './runtime-env';
import {type StaffRole,permits,staffRole,stockChangeSchema,auditStatement,adjustStock} from './operations';
import {actionResource,executeOperation} from './operation-actions';
import {productSchema} from './product-input';
import {returnUpdateSchema} from './commerce-db';
import {saveAdminProduct,setAdminProductStatus,PRODUCT_STATUSES} from './store-db';

type Identity={email:string;role:StaffRole};
type Approval={id:string;actor:string;role:StaffRole;action:string;payload_json:string;baseline_json:string;status:string;reviewer:string;review_note:string;result_json:string;created_at:string;reviewed_at:string|null};
const id=z.string().trim().min(1).max(160);
const tracking=z.object({reference:id,carrier:z.string().trim().min(1).max(100),trackingNumber:z.string().trim().min(1).max(160),trackingUrl:z.string().max(1000).refine(s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return !s;}}),deliveryEstimate:z.string().max(160)});
const schemas:Record<string,z.ZodTypeAny>={
 'operation:stock':stockChangeSchema,
 'inventory':stockChangeSchema,
 'operation:prices':z.array(z.object({id,expectedPrice:z.number().int(),priceKobo:z.number().int().min(100).max(100000000000)})).min(1).max(100),
 'operation:import':z.array(productSchema.refine(p=>!p.id,'Imports create new drafts.')).min(1).max(25),
 'operation:order':z.object({reference:id,status:z.enum(['processing','shipped','delivered'])}),
 'operation:tracking':tracking,
 'operation:return':returnUpdateSchema,
 'operation:exchange':z.object({returnId:id,items:z.array(z.object({originalVariantId:id,variantId:id,quantity:z.number().int().min(1).max(6)})).min(1).max(21)}),
 'operation:exchange-tracking':z.object({returnId:id,carrier:z.string().trim().min(1).max(100),trackingNumber:z.string().trim().min(1).max(160),status:z.enum(['shipped','delivered'])}),
 'product:create':productSchema,
 'product:update':productSchema.refine(p=>!!p.id&&p.variants.every(v=>!v.id||v.expectedStock!==undefined),'Refresh this product before submitting.'),
 'product:status':z.object({productId:id,status:z.enum(PRODUCT_STATUSES)}),
 'upload':z.object({key:z.string().regex(/^approval-staging\/[a-f0-9-]+\.(jpg|png|webp|avif)$/),name:z.string().max(255),contentType:z.enum(['image/jpeg','image/png','image/webp','image/avif'])})
};
function permitted(role:StaffRole,action:string){
 if(role==='owner')return false;
 if(action.startsWith('operation:'))return !!actionResource[action.slice(10)]&&permits(role,actionResource[action.slice(10)])&&!!schemas[action];
 return role==='catalogue'&&['inventory','product:create','product:update','product:status','upload'].includes(action);
}
async function validate(role:StaffRole,action:string,input:unknown){
 if(!permitted(role,action))throw new Error('Your role cannot request this change.');
 const data=schemas[action].parse(input);
 if(action==='product:create')delete data.id;
 if(action==='operation:return'){
  const current=await getDbBinding().prepare('SELECT refund_kobo,refund_status,refund_reference FROM return_requests WHERE id=?').bind(data.id).first<{refund_kobo:number;refund_status:string;refund_reference:string}>();
  if(!current||data.refundKobo!==current.refund_kobo||data.refundStatus!==current.refund_status||data.refundReference!==current.refund_reference)throw new Error('Only the owner can change refunds.');
 }
 return data;
}
// Capture only the affected records; a changed baseline requires a fresh proposal.
async function baseline(action:string,data:any):Promise<unknown>{
 const db=getDbBinding();
 const row=async(sql:string,...params:string[])=>{const value=await db.prepare(sql).bind(...params).first();if(!value)throw new Error('The record no longer exists.');return value;};
 if(action==='inventory'||action==='operation:stock')return row('SELECT v.id,v.stock,p.name AS product,v.color,v.size,v.sku FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id=?',data.variantId);
 if(action==='operation:prices')return Promise.all(data.map((p:{id:string})=>row('SELECT id,name,price_kobo FROM products WHERE id=?',p.id)));
 if(action==='product:update')return {product:await row('SELECT * FROM products WHERE id=?',data.id),variants:(await db.prepare('SELECT * FROM product_variants WHERE product_id=? ORDER BY id').bind(data.id).all()).results,images:(await db.prepare('SELECT * FROM product_images WHERE product_id=? ORDER BY id').bind(data.id).all()).results};
 if(action==='product:status')return row('SELECT id,name,status FROM products WHERE id=?',data.productId);
 if(action==='operation:order'||action==='operation:tracking')return row('SELECT reference,status,payment_status,tracking_number,carrier,tracking_url,delivery_estimate FROM orders WHERE reference=?',data.reference);
 if(action==='operation:return'||action==='operation:exchange'||action==='operation:exchange-tracking')return {request:await row('SELECT * FROM return_requests WHERE id=?',data.id||data.returnId),exchange:await db.prepare('SELECT * FROM exchanges WHERE return_id=?').bind(data.id||data.returnId).first()};
 return null;
}
export async function submitApproval(auth:Identity,action:string,input:unknown){
 const data=await validate(auth.role,action,input),before=await baseline(action,data),db=getDbBinding(),payload=JSON.stringify(data),snapshot=JSON.stringify(before);
 // An atomic partial unique index coalesces simultaneous network retries.
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([auth.role,action,payload,snapshot])));
 const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''),requestId=crypto.randomUUID();
 await db.batch([db.prepare('INSERT OR IGNORE INTO admin_approvals(id,actor,role,action,request_hash,payload_json,baseline_json) VALUES(?,?,?,?,?,?,?)').bind(requestId,auth.email,auth.role,action,hash,payload,snapshot),db.prepare("INSERT INTO admin_audit(actor,action,entity,detail) SELECT ?,'approval requested',?,? WHERE EXISTS(SELECT 1 FROM admin_approvals WHERE id=?)").bind(auth.email,requestId,action,requestId)]);
 const stored=await db.prepare("SELECT id FROM admin_approvals WHERE actor=? AND request_hash=? AND status IN ('pending','applying') ORDER BY created_at DESC LIMIT 1").bind(auth.email,hash).first<{id:string}>();
 if(!stored)throw new Error('This request was just reviewed. Refresh before submitting again.');
 return stored.id;
}
export function pendingResponse(id:string){return Response.json({pending:true,requestId:id,message:'Submitted for owner approval. No live changes have been made.'},{status:202,headers:{'Cache-Control':'no-store'}});}
export async function listApprovals(auth:Identity,params:URLSearchParams){
 const page=Math.max(1,Math.min(10000,Number(params.get('page'))||1)),status=params.get('status')||'pending',db=getDbBinding();
 if(!['all','pending','applying','approved','rejected','conflict','review'].includes(status))throw new Error('Invalid request status.');
 const where="(?='owner' OR actor=?) AND (?='all' OR status=?)";
 const rows=await db.prepare(`SELECT * FROM admin_approvals WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT 26 OFFSET ?`).bind(auth.role,auth.email,status,status,(Math.floor(page)-1)*25).all<Approval>();
 const pending=await db.prepare("SELECT COUNT(*) AS count FROM admin_approvals WHERE status='pending' AND (?='owner' OR actor=?)").bind(auth.role,auth.email).first<{count:number}>();
 return {requests:rows.results.slice(0,25).map(r=>({...r,payload:JSON.parse(r.payload_json),before:JSON.parse(r.baseline_json),result:JSON.parse(r.result_json),payload_json:undefined,baseline_json:undefined,result_json:undefined})),hasMore:rows.results.length>25,pending:pending?.count||0};
}
export async function reviewApproval(auth:Identity,input:unknown){
 if(auth.role!=='owner')throw new Error('Only the owner can review changes.');
 const v=z.object({id,decision:z.enum(['approve','reject']),note:z.string().trim().max(1000).default('')}).parse(input),db=getDbBinding();
 const request=await db.prepare('SELECT * FROM admin_approvals WHERE id=?').bind(v.id).first<Approval>();
 if(!request||request.status!=='pending')throw new Error('This request has already been reviewed or is being applied. Refresh the queue.');
 if(request.action==='walk-in-sale')return reviewSale(auth,v.id,v.decision,v.note);
 if(v.decision==='reject'){
  const r=await db.prepare("UPDATE admin_approvals SET status='rejected',reviewer=?,review_note=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").bind(auth.email,v.note,v.id).run();
  if(!r.meta.changes)throw new Error('This request was already reviewed.');
  await auditStatement(auth.email,'approval rejected',v.id,v.note).run();return {status:'rejected'};
 }
 const currentRole=await staffRole(request.actor);
 if(currentRole!==request.role||!permitted(request.role,request.action))throw new Error('This staff member is inactive or their permissions changed. Reject this request.');
 const data=await validate(request.role,request.action,JSON.parse(request.payload_json));
 const before=JSON.stringify(await baseline(request.action,data));
 if(before!==request.baseline_json){
  await db.batch([db.prepare("UPDATE admin_approvals SET status='conflict',reviewer=?,review_note='The record changed. A fresh request is required.',reviewed_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").bind(auth.email,v.id),auditStatement(auth.email,'approval conflict',v.id)]);
  return {status:'conflict'};
 }
 // Claim once before invoking any mutation. Never automatically retry an applying/review request:
 // a process interruption may have happened after a write or notification was committed.
 const claim=await db.prepare("UPDATE admin_approvals SET status='applying',reviewer=?,review_note=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").bind(auth.email,v.note,v.id).run();
 if(!claim.meta.changes)throw new Error('This request is already being reviewed.');
 try{
  let result:unknown={ok:true};const actor=`${auth.email} (approved ${request.actor}; ${v.id})`;
  if(request.action.startsWith('operation:'))result=await executeOperation(request.action.slice(10),data,actor,request.role);
  else if(request.action==='inventory')await adjustStock(data,actor);
  else if(request.action==='product:create')result=await saveAdminProduct({...data,id:undefined},actor);
  else if(request.action==='product:update')result=await saveAdminProduct(data,actor);
  else if(request.action==='product:status')result=await setAdminProductStatus(data.productId,data.status);
  else if(request.action==='upload'){
   const bucket=runtimeEnv().BUCKET;if(!bucket)throw new Error('Image storage unavailable.');
   const file=await bucket.get(data.key);if(!file)throw new Error('Staged image is missing.');
   const key=data.key.replace('approval-staging/','products/');
   await bucket.put(key,file.body,{httpMetadata:{contentType:data.contentType,cacheControl:'public, max-age=31536000, immutable'}});
   result={url:`/api/media/${key}`};
  }
  const partial=Array.isArray(result)&&result.some(r=>!r.ok),status=partial?'review':'approved';
  await db.batch([db.prepare('UPDATE admin_approvals SET status=?,result_json=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=? AND status=\'applying\'').bind(status,JSON.stringify(result),v.id),auditStatement(auth.email,partial?'approval partially applied':'approval applied',v.id,request.actor+': '+request.action)]);
  return {status,result};
 }catch(e){
  const message=e instanceof Error?e.message:'Could not apply change.';
  await db.batch([db.prepare("UPDATE admin_approvals SET status='review',review_note=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=? AND status='applying'").bind(`${v.note}\n${message}\nCheck the live record before requesting any retry.`,v.id),auditStatement(auth.email,'approval needs review',v.id,message)]);
  return {status:'review',error:message};
 }
}
export async function approvalImage(auth:Identity,requestId:string){
 const row=await getDbBinding().prepare("SELECT actor,payload_json FROM admin_approvals WHERE id=? AND action='upload'").bind(requestId).first<{actor:string;payload_json:string}>();
 if(!row||(auth.role!=='owner'&&auth.email!==row.actor))return new Response('Not found',{status:404});
 const file=await runtimeEnv().BUCKET?.get(JSON.parse(row.payload_json).key);
 return file?new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}}):new Response('Not found',{status:404});
}
