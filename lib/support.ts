import {z} from 'zod';
import {getDbBinding,isAdminEmail,runtimeEnv} from './runtime-env';
import type {StaffRole} from './operations-permissions';
const status=z.enum(['open','in_progress','waiting_customer','resolved']);
const priority=z.enum(['normal','high','urgent']);
const assignedTo=z.union([z.literal(''),z.string().trim().toLowerCase().email().max(200)]);
export const supportCreateSchema=z.object({id:z.string().uuid(),subject:z.string().trim().min(3).max(160),customerName:z.string().trim().min(1).max(120),contact:z.string().trim().max(200).default(''),channel:z.enum(['email','phone','instagram','walk_in','other']),orderReference:z.string().trim().max(120).default(''),category:z.enum(['order','delivery','payment','return','sizing','product','privacy','other']),priority,assignedTo,note:z.string().trim().min(3).max(4000)}).strict();
export const supportUpdateSchema=z.object({id:z.string().uuid(),version:z.number().int().min(1),status,priority,assignedTo,note:z.string().trim().max(4000).default('')}).strict();
type Identity={email:string;role:StaffRole};
export async function validateSupportLinks(v:{assignedTo:string;orderReference?:string}){
 const db=getDbBinding();
 if(v.assignedTo&&!isAdminEmail(v.assignedTo)&&!await db.prepare("SELECT email FROM admin_staff WHERE email=? AND role='support' AND active=1").bind(v.assignedTo).first())throw new Error('Choose an enabled support colleague or leave unassigned.');
 if(v.orderReference&&!await db.prepare('SELECT id FROM orders WHERE reference=?').bind(v.orderReference).first())throw new Error('Order reference was not found. Check the reference or leave it blank.');
}
export async function applySupportChange(action:string,input:unknown,actor:string){
 const db=getDbBinding();
 if(action==='support:create'){
  const v=supportCreateSchema.parse(input);await validateSupportLinks(v);
  const gate='EXISTS(SELECT 1 FROM support_tickets WHERE id=? AND created_by=?)';
  const existing=await db.prepare('SELECT id FROM support_tickets WHERE id=?').bind(v.id).first();if(existing)throw new Error('This enquiry has already been recorded. Refresh the inbox.');
  await db.batch([
   db.prepare('INSERT INTO support_tickets(id,subject,customer_name,contact,channel,order_reference,category,priority,assigned_to,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(v.id,v.subject,v.customerName,v.contact,v.channel,v.orderReference,v.category,v.priority,v.assignedTo,actor),
   db.prepare(`INSERT INTO support_notes(id,ticket_id,author,body) SELECT ?,?,?,? WHERE ${gate}`).bind(crypto.randomUUID(),v.id,actor,v.note,v.id,actor),
   db.prepare(`INSERT INTO admin_audit(actor,action,entity,detail) SELECT ?,'support enquiry created',?,'Private customer enquiry' WHERE ${gate}`).bind(actor,v.id,v.id,actor)
  ]);return {id:v.id};
 }
 if(action!=='support:update')throw new Error('Unknown support action.');
 const v=supportUpdateSchema.parse(input);await validateSupportLinks(v);const token=crypto.randomUUID(),key='support:'+v.id,gate='EXISTS(SELECT 1 FROM store_meta WHERE key=? AND value=?)';
 const statements=[db.prepare('INSERT INTO store_meta(key,value) SELECT ?,? WHERE EXISTS(SELECT 1 FROM support_tickets WHERE id=? AND version=?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,token,v.id,v.version),
 db.prepare(`UPDATE support_tickets SET status=?,priority=?,assigned_to=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND ${gate}`).bind(v.status,v.priority,v.assignedTo,v.id,key,token)];
 if(v.note)statements.push(db.prepare(`INSERT INTO support_notes(id,ticket_id,author,body) SELECT ?,?,?,? WHERE ${gate}`).bind(crypto.randomUUID(),v.id,actor,v.note,key,token));
 statements.push(db.prepare(`INSERT INTO admin_audit(actor,action,entity,detail) SELECT ?,'support enquiry updated',?,? WHERE ${gate}`).bind(actor,v.id,JSON.stringify({status:v.status,priority:v.priority,assignedTo:v.assignedTo}),key,token),db.prepare('DELETE FROM store_meta WHERE key=? AND value=?').bind(key,token));
 const result=await db.batch(statements);if(!result[0].meta.changes)throw new Error('This enquiry changed. Refresh before requesting an update.');return {id:v.id};
}
export async function supportData(auth:Identity,p:URLSearchParams){
 const db=getDbBinding();
 if(p.get('resource')==='attention')return supportAttention(auth.email);
 if(p.get('resource')==='order-context')return supportOrderContext(p.get('reference')||'',auth);
 if(p.get('id')){
  const id=z.string().uuid().parse(p.get('id'));
  const ticket=await db.prepare('SELECT * FROM support_tickets WHERE id=?').bind(id).first();if(!ticket)throw new Error('Enquiry not found.');
  const notes=await db.prepare('SELECT author,body,created_at FROM support_notes WHERE ticket_id=? ORDER BY created_at DESC,id DESC LIMIT 100').bind(id).all();return {ticket,notes:notes.results};
 }
 const filter=p.get('status')||'all',q='%'+(p.get('q')||'').trim().slice(0,120).replace(/[\\%_]/g,'\\$&')+'%',mine=p.get('mine')==='1',page=Math.max(1,Math.min(10000,Math.floor(Number(p.get('page'))||1)));
 if(filter!=='all'&&filter!=='active')status.parse(filter);
 const [tickets,counts,returns,pending,team]=await Promise.all([
 db.prepare(`SELECT *,NOT EXISTS(SELECT 1 FROM support_reads r WHERE r.ticket_id=support_tickets.id AND r.viewer=? AND r.version>=support_tickets.version) AS unread FROM support_tickets WHERE (?='all' OR (?='active' AND status<>'resolved') OR status=?) AND (?=0 OR assigned_to=?) AND (subject LIKE ? ESCAPE '\\' OR customer_name LIKE ? ESCAPE '\\' OR contact LIKE ? ESCAPE '\\' OR order_reference LIKE ? ESCAPE '\\' OR public_reference LIKE ? ESCAPE '\\') ORDER BY CASE status WHEN 'resolved' THEN 1 ELSE 0 END,CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,updated_at DESC,id DESC LIMIT 26 OFFSET ?`).bind(auth.email.toLowerCase(),filter,filter,filter,mine?1:0,auth.email.toLowerCase(),q,q,q,q,q,(page-1)*25).all(),
 db.prepare("SELECT COUNT(*) AS total,SUM(CASE WHEN status<>'resolved' THEN 1 ELSE 0 END) AS active,SUM(CASE WHEN status='waiting_customer' THEN 1 ELSE 0 END) AS waiting,SUM(CASE WHEN status<>'resolved' AND assigned_to=? THEN 1 ELSE 0 END) AS mine FROM support_tickets").bind(auth.email.toLowerCase()).first(),
 db.prepare("SELECT COUNT(*) AS count FROM return_requests WHERE status IN ('requested','approved','received')").first(),
 db.prepare("SELECT COUNT(*) AS count FROM admin_approvals WHERE status='pending' AND (?='owner' OR actor=?) AND (action LIKE 'support:%' OR action IN ('operation:order','operation:tracking','operation:return','operation:exchange','operation:exchange-tracking'))").bind(auth.role,auth.email).first(),
 db.prepare("SELECT email FROM admin_staff WHERE active=1 AND role='support' ORDER BY email").all()
 ]);
 return {tickets:tickets.results.slice(0,25),hasMore:tickets.results.length>25,page,counts,returns,pending,team:[...team.results,...(runtimeEnv().ADMIN_EMAIL?[{email:runtimeEnv().ADMIN_EMAIL!.trim().toLowerCase()}]:[])]};
}

export async function supportAttention(email:string){
 return await getDbBinding().prepare("SELECT COUNT(*) AS active,COALESCE(SUM(CASE WHEN t.priority='urgent' THEN 1 ELSE 0 END),0) AS urgent,COALESCE(SUM(CASE WHEN COALESCE(r.version,0)<t.version THEN 1 ELSE 0 END),0) AS unread FROM support_tickets t LEFT JOIN support_reads r ON r.ticket_id=t.id AND r.viewer=? WHERE t.status<>'resolved'").bind(email.toLowerCase()).first();
}
export async function markSupportRead(email:string,id:string,version:number){
 z.string().uuid().parse(id);z.number().int().positive().parse(version);
 await getDbBinding().prepare('INSERT INTO support_reads(ticket_id,viewer,version) SELECT id,?,? FROM support_tickets WHERE id=? AND version=? ON CONFLICT(ticket_id,viewer) DO UPDATE SET version=MAX(support_reads.version,excluded.version)').bind(email.toLowerCase(),version,id,version).run();
}
export async function supportOrderContext(reference:string,auth:Identity){
 const db=getDbBinding();
 const order=await db.prepare('SELECT id,reference FROM orders WHERE reference=?').bind(reference.slice(0,120)).first<{id:string;reference:string}>();if(!order)throw Error('Order not found.');
 const [returns,enquiries,approvals]=await Promise.all([
 db.prepare('SELECT r.id,r.kind,r.status,r.reason,r.notes,r.refund_status,r.refund_kobo,r.created_at,e.status AS exchange_status,e.carrier,e.tracking_number FROM return_requests r LEFT JOIN exchanges e ON e.return_id=r.id WHERE r.order_id=? ORDER BY r.created_at DESC LIMIT 30').bind(order.id).all(),
 db.prepare('SELECT id,subject,status,priority,public_reference FROM support_tickets WHERE order_reference=? ORDER BY updated_at DESC LIMIT 30').bind(reference).all(),
 db.prepare("SELECT id,action,status,actor,created_at FROM admin_approvals WHERE status IN ('pending','applying') AND (?='owner' OR actor=?) AND (json_extract(payload_json,'$.reference')=? OR (action LIKE 'support:%' AND json_extract(payload_json,'$.id') IN (SELECT id FROM support_tickets WHERE order_reference=?)) OR (action IN ('operation:return','operation:exchange','operation:exchange-tracking') AND COALESCE(json_extract(payload_json,'$.returnId'),json_extract(payload_json,'$.id')) IN (SELECT id FROM return_requests WHERE order_id=?))) ORDER BY created_at DESC LIMIT 30").bind(auth.role,auth.email,reference,reference,order.id).all()
 ]);return {returns:returns.results,enquiries:enquiries.results,approvals:approvals.results};
}
