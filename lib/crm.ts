import {z} from 'zod';
import {getDbBinding} from './runtime-env';
import {automationRule} from './automation-state';
import {customerTags} from './automation-policy';
import {circleMembership} from './circle';
const emailSchema=z.string().trim().toLowerCase().email().max(200);
const aggregate=`WITH identities AS (SELECT lower(email) email FROM orders UNION SELECT lower(email) FROM app_customers UNION SELECT lower(email) FROM subscribers UNION SELECT email FROM crm_profiles), stats AS (
 SELECT i.email,COALESCE((SELECT name FROM app_customers a WHERE lower(a.email)=i.email),(SELECT first_name||' '||last_name FROM orders o WHERE lower(o.email)=i.email ORDER BY created_at DESC LIMIT 1),'') name,
 (SELECT phone FROM orders o WHERE lower(o.email)=i.email ORDER BY created_at DESC LIMIT 1) phone,
 (SELECT MAX(created_at) FROM orders o WHERE lower(o.email)=i.email) lastOrder,
 (SELECT COUNT(*) FROM orders o WHERE lower(o.email)=i.email) orders,
 (SELECT COUNT(*) FROM orders o WHERE lower(o.email)=i.email AND payment_status='paid') paidOrders,
 (SELECT COALESCE(SUM(total_kobo),0) FROM orders o WHERE lower(o.email)=i.email AND payment_status='paid') grossKobo,
 (SELECT COALESCE(SUM(r.refund_kobo),0) FROM return_requests r JOIN orders o ON o.id=r.order_id WHERE lower(o.email)=i.email AND r.refund_status='completed') refundsKobo,
 (SELECT MAX(paid_at) FROM orders o WHERE lower(o.email)=i.email AND payment_status='paid') lastPaid
 FROM identities i WHERE i.email LIKE '%@%')`;
type Customer={email:string;name:string;phone:string|null;lastOrder:string|null;orders:number;paidOrders:number;grossKobo:number;refundsKobo:number;lastPaid:string|null;tags:string[];netKobo:number};
export async function crmCustomers(q='',page=1,tag=''){
 const db=getDbBinding(),c=(await automationRule('customers')).config,needle=q.slice(0,100).toLowerCase();
 const rows=await db.prepare(`${aggregate} SELECT * FROM stats WHERE (instr(lower(email),?)>0 OR instr(lower(name),?)>0) AND (?='' OR (?='VIP' AND (paidOrders>=? OR grossKobo-refundsKobo>=?)) OR (?='Repeat buyer' AND paidOrders>1) OR (?='First-time buyer' AND paidOrders=1) OR (?='Inactive' AND julianday(lastPaid)<=julianday('now')-?) OR (?='Prospect' AND paidOrders=0)) ORDER BY lastPaid DESC,email LIMIT 26 OFFSET ?`).bind(needle,needle,tag,tag,c.vipOrders,c.vipSpendKobo,tag,tag,tag,c.inactiveDays,tag,(page-1)*25).all<Customer>();
 return {customers:rows.results.slice(0,25).map(r=>({...r,netKobo:Math.max(0,r.grossKobo-r.refundsKobo),tags:customerTags(r.paidOrders,Math.max(0,r.grossKobo-r.refundsKobo),r.lastPaid,c)})),hasMore:rows.results.length>25,page};
}
export async function crmProfile(email:string){email=emailSchema.parse(email);const db=getDbBinding(),c=(await automationRule('customers')).config;
 const [stats,profile,notes,orders,support,consents,account,sizes]=await Promise.all([
 db.prepare(`${aggregate} SELECT * FROM stats WHERE email=?`).bind(email).first<Customer>(),
 db.prepare('SELECT * FROM crm_profiles WHERE email=?').bind(email).first<{tags_json:string;preferences:string;version:number}>(),
 db.prepare('SELECT * FROM crm_notes WHERE email=? ORDER BY created_at DESC,id DESC LIMIT 50').bind(email).all(),
 db.prepare('SELECT reference,total_kobo,payment_status,status,created_at FROM orders WHERE lower(email)=? ORDER BY created_at DESC LIMIT 50').bind(email).all(),
 db.prepare('SELECT id,subject,status,priority,assigned_to,order_reference,updated_at FROM support_tickets WHERE lower(contact)=? OR order_reference IN (SELECT reference FROM orders WHERE lower(email)=?) ORDER BY updated_at DESC LIMIT 50').bind(email,email).all(),
 db.prepare('SELECT kind,status,updated_at FROM subscribers WHERE lower(email)=? ORDER BY updated_at DESC LIMIT 50').bind(email).all(),
 db.prepare('SELECT id FROM app_customers WHERE lower(email)=?').bind(email).first<{id:string}>(),
 db.prepare("SELECT i.size,i.color,COUNT(*) purchases FROM order_items i JOIN orders o ON o.id=i.order_id WHERE lower(o.email)=? AND o.payment_status='paid' AND i.is_gift=0 GROUP BY i.size,i.color ORDER BY purchases DESC LIMIT 15").bind(email).all()
 ]);if(!stats)throw Error('Customer not found.');
 return {customer:{...stats,netKobo:Math.max(0,stats.grossKobo-stats.refundsKobo),tags:customerTags(stats.paidOrders,Math.max(0,stats.grossKobo-stats.refundsKobo),stats.lastPaid,c)},profile:{tags:profile?JSON.parse(profile.tags_json) as string[]:[],preferences:profile?.preferences||'',version:profile?.version||0},notes:notes.results,orders:orders.results,support:support.results,consents:consents.results,sizes:sizes.results,membership:account?await circleMembership(account.id):null};
}
export async function crmSave(input:unknown,actor:string){const v=z.object({email:emailSchema,version:z.number().int().nonnegative(),tags:z.array(z.string().trim().min(1).max(40)).max(12),preferences:z.string().trim().max(2000),note:z.string().trim().max(4000).default('')}).strict().parse(input),db=getDbBinding();await crmProfile(v.email);
 const token=crypto.randomUUID(),key='crm-save:'+v.email,gate='EXISTS(SELECT 1 FROM store_meta WHERE key=? AND value=?)';
 const r=await db.batch([
 db.prepare(`INSERT INTO store_meta(key,value) SELECT ?,? WHERE (?=0 AND NOT EXISTS(SELECT 1 FROM crm_profiles WHERE email=?)) OR EXISTS(SELECT 1 FROM crm_profiles WHERE email=? AND version=?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).bind(key,token,v.version,v.email,v.email,v.version),
 db.prepare(`INSERT INTO crm_profiles(email,tags_json,preferences) SELECT ?,?,? WHERE ${gate} ON CONFLICT(email) DO UPDATE SET tags_json=excluded.tags_json,preferences=excluded.preferences,version=crm_profiles.version+1,updated_at=CURRENT_TIMESTAMP`).bind(v.email,JSON.stringify([...new Set(v.tags)]),v.preferences,key,token),
 db.prepare(`INSERT INTO crm_notes(id,email,author,body) SELECT ?,?,?,? WHERE ?<>'' AND ${gate}`).bind(crypto.randomUUID(),v.email,actor,v.note,v.note,key,token),
 db.prepare(`INSERT INTO admin_audit(actor,action,entity,detail) SELECT ?,'customer profile saved',?,'Preferences, tags or private note updated' WHERE ${gate}`).bind(actor,v.email,key,token),
 db.prepare('DELETE FROM store_meta WHERE key=? AND value=?').bind(key,token)
 ]);if(!r[0].meta.changes)throw Error('Profile changed. Reload before saving.');return crmProfile(v.email);
}
export async function syncCrm(){const r=await getDbBinding().prepare("INSERT OR IGNORE INTO crm_profiles(email) SELECT lower(email) FROM orders WHERE email LIKE '%@%' UNION SELECT lower(email) FROM app_customers UNION SELECT lower(email) FROM subscribers").run();return {created:r.meta.changes};}
