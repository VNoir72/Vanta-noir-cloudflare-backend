import {z} from 'zod';
import {getDbBinding} from './runtime-env';

const emailSchema=z.string().trim().toLowerCase().email().max(200);
type AccessRecord={status:'active'|'suspended';version:number;reason:string;updatedAt:number;updatedBy:string;validAfter:number;operation:string};
export class CustomerAccessError extends Error {
 constructor(message:string,public status=409){super(message);}
}
export function customerAccessKey(email:string){return 'customer-access:'+email.trim().toLowerCase();}
export async function customerAccessRecord(email:string){
 const row=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind(customerAccessKey(email)).first<{value:string}>();
 return row?JSON.parse(row.value) as AccessRecord:null;
}
export async function customerAccessAllowed(email:string,authenticatedAt?:number){
 const record=await customerAccessRecord(email);
 return !record||(record.status==='active'&&(authenticatedAt===undefined||authenticatedAt>record.validAfter));
}
export async function customerAccountAccess(input:string){
 const email=emailSchema.parse(input),db=getDbBinding();
 const [account,record]=await Promise.all([
  db.prepare('SELECT id FROM app_customers WHERE lower(email)=?').bind(email).first<{id:string}>(),
  customerAccessRecord(email),
 ]);
 return {email,registered:!!account,status:record?.status||'active' as const,version:record?.version||0,reason:record?.reason||'',updatedAt:record?.updatedAt||null,updatedBy:record?.updatedBy||''};
}
export async function changeCustomerAccountAccess(input:unknown,actor:string){
 const v=z.object({email:emailSchema,action:z.enum(['suspend','restore']),version:z.number().int().nonnegative(),reason:z.string().trim().min(5).max(1000)}).strict().parse(input);
 const db=getDbBinding(),account=await db.prepare('SELECT id FROM app_customers WHERE lower(email)=?').bind(v.email).first<{id:string}>();
 if(!account)throw new CustomerAccessError('This customer has no registered store account.',404);
 const key=customerAccessKey(v.email),operation=crypto.randomUUID(),now=Date.now();
 // The cutoff also invalidates cached Firebase tokens after restoration. Old
 // sessions cannot be recreated by replaying an identity token from before it.
 const record:AccessRecord={status:v.action==='suspend'?'suspended':'active',version:v.version+1,reason:v.reason,updatedAt:now,updatedBy:actor,validAfter:Math.floor(now/1000)*1000,operation};
 const gate="EXISTS(SELECT 1 FROM store_meta WHERE key=? AND json_extract(value,'$.operation')=?)";
 // D1 batches are atomic. The version check prevents a stale tab or concurrent
 // restore from silently undoing a newer suspension. No provider mutation is
 // needed: all store authentication and checkout enforce this durable record.
 const result=await db.batch([
  db.prepare("INSERT INTO store_meta(key,value) SELECT ?,? WHERE (?=0 AND NOT EXISTS(SELECT 1 FROM store_meta WHERE key=?)) OR EXISTS(SELECT 1 FROM store_meta WHERE key=? AND json_extract(value,'$.version')=?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(key,JSON.stringify(record),v.version,key,key,v.version),
  db.prepare(`DELETE FROM store_meta WHERE key IN (SELECT 'firebase-session:'||digest FROM app_sessions WHERE customer_id=?) AND ${gate}`).bind(account.id,key,operation),
  db.prepare(`DELETE FROM app_sessions WHERE customer_id=? AND ${gate}`).bind(account.id,key,operation),
  db.prepare(`DELETE FROM store_meta WHERE key LIKE 'deletion-grant:%' AND json_extract(value,'$.customerId')=? AND ${gate}`).bind(account.id,key,operation),
  db.prepare(`DELETE FROM app_login_challenges WHERE lower(email)=? AND ${gate}`).bind(v.email,key,operation),
  db.prepare(`INSERT INTO admin_audit(actor,action,entity,detail) SELECT ?,?,?,? WHERE ${gate}`).bind(actor,v.action==='suspend'?'customer account suspended':'customer account restored',v.email,JSON.stringify({reason:v.reason,version:record.version,operation}),key,operation),
 ]);
 if(!result[0].meta.changes)throw new CustomerAccessError('Account access changed. Reload its status before trying again.');
 return customerAccountAccess(v.email);
}
