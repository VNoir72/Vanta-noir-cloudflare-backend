import {z} from 'zod';
import {getDbBinding} from './runtime-env';
import {appControlsSnapshot} from './app-controls';
import {dropAccess,type AppAccess} from './app-controls-policy';
import {receiptDigest} from './receipt-access';
const watchSchema=z.object({kind:z.enum(['restock','drop']),target:z.string().min(1).max(160),enabled:z.boolean()}).strict();
export async function memberHub(access:AppAccess){
 const {config}=await appControlsSnapshot(),db=getDbBinding();
 const products=await db.prepare("SELECT id,name,slug FROM products WHERE active=1 AND status='published'").all<{id:string;name:string;slug:string}>();
 const drops=config.enabled&&config.calendar&&access.verifiedApp?config.drops.filter(d=>!d.paused&&products.results.some(p=>p.id===d.productId)&&(!d.vipEmails.length||d.vipEmails.includes(access.email))).map(d=>({productId:d.productId,title:d.title,startsAt:d.startsAt,publicAt:d.publicAt,mode:d.mode,available:dropAccess(d,access),slug:products.results.find(p=>p.id===d.productId)!.slug})):[];
 const watches=await db.prepare("SELECT key,value FROM store_meta WHERE key LIKE ? ORDER BY key LIMIT 100").bind('app-watch:'+access.customerId+':%').all<{key:string;value:string}>();
 return {verified:access.verifiedApp,enabled:config.enabled,restocks:config.enabled&&config.restocks,announcement:config.enabled?config.announcement:'',drops,watches:access.verifiedApp?watches.results.map(r=>JSON.parse(r.value)):[]};
}
export async function setMemberWatch(access:AppAccess,input:unknown){
 if(!access.verifiedApp||!access.customerId)throw Error('Open the verified Vanta Noir app to set an alert.');
 const v=watchSchema.parse(input),db=getDbBinding(),key='app-watch:'+access.customerId+':'+await receiptDigest(v.kind+':'+v.target);
 if(!v.enabled){await db.prepare('DELETE FROM store_meta WHERE key=?').bind(key).run();return {ok:true};}
 const {config}=await appControlsSnapshot();if(!config.enabled)throw Error('App benefits are paused.');
 if(v.kind==='drop'){const d=config.drops.find(d=>d.productId===v.target);if(!config.calendar||!d||d.paused||d.vipEmails.length&&!d.vipEmails.includes(access.email))throw Error('This drop is unavailable.');}
 const variant=v.kind==='restock'?await db.prepare("SELECT v.id,p.id AS productId,p.name,v.color,v.size FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id=? AND v.active=1 AND p.active=1 AND p.status='published'").bind(v.target).first<{id:string;productId:string;name:string;color:string;size:string}>():null;
 if(v.kind==='restock'&&(!config.restocks||!variant))throw Error('Choose an available product colour and size.');
 const title=variant?`${variant.name} · ${variant.color} · ${variant.size}`:config.drops.find(d=>d.productId===v.target)!.title;
 const result=await db.prepare(`INSERT INTO store_meta(key,value) SELECT ?,? WHERE (SELECT COUNT(*) FROM store_meta WHERE key LIKE ?)<100 ON CONFLICT(key) DO UPDATE SET value=excluded.value`).bind(key,JSON.stringify({kind:v.kind,target:v.target,title,customerId:access.customerId,status:'waiting',createdAt:new Date().toISOString()}),'app-watch:'+access.customerId+':%').run();
 if(!result.meta.changes)throw Error('You have 100 alerts. Remove one before adding another.');return {ok:true};
}
export async function checkMemberAlerts(){
 const db=getDbBinding(),{config}=await appControlsSnapshot();if(!config.enabled)return;
 const cursor=await db.prepare("SELECT value FROM store_meta WHERE key='app-watch-cursor'").first<{value:string}>();
 let rows=await db.prepare("SELECT key,value FROM store_meta WHERE key LIKE 'app-watch:%' AND key>? ORDER BY key LIMIT 20").bind(cursor?.value||'').all<{key:string;value:string}>();
 if(!rows.results.length)rows=await db.prepare("SELECT key,value FROM store_meta WHERE key LIKE 'app-watch:%' ORDER BY key LIMIT 20").all<{key:string;value:string}>();
 for(const r of rows.results){const w=JSON.parse(r.value) as {kind:string;target:string;customerId:string;status:string;title:string};if(!['waiting','ready'].includes(w.status))continue;
 const user=await db.prepare('SELECT email FROM app_customers WHERE id=?').bind(w.customerId).first<{email:string}>();if(!user){await db.prepare('DELETE FROM store_meta WHERE key=?').bind(r.key).run();continue;}
 const ready=await memberWatchReady(w,user.email);
 if(!ready&&w.status==='ready')await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(JSON.stringify({...w,status:'waiting',readyAt:null}),r.key,r.value).run();
 if(ready&&w.status==='waiting')await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(JSON.stringify({...w,status:'ready',readyAt:new Date().toISOString()}),r.key,r.value).run();
 }
 if(rows.results.length)await db.prepare("INSERT INTO store_meta(key,value) VALUES('app-watch-cursor',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(rows.results.at(-1)!.key).run();
}

export async function memberWatchReady(w:{kind:string;target:string;customerId:string},email:string){
 const db=getDbBinding(),{config}=await appControlsSnapshot();if(!config.enabled)return false;
 const access={verifiedApp:true,email,customerId:w.customerId};let ready=false;
 if(w.kind==='drop'){const d=config.drops.find(d=>d.productId===w.target);ready=!!(config.calendar&&d&&dropAccess(d,access)&&await db.prepare("SELECT id FROM products WHERE id=? AND active=1 AND status='published'").bind(w.target).first());}
 else if(config.restocks){const v=await db.prepare(`SELECT v.product_id,MAX(0,v.stock-COALESCE((SELECT SUM(quantity) FROM stock_reservations WHERE variant_id=v.id AND expires_at>CURRENT_TIMESTAMP),0)) AS available FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id=? AND v.active=1 AND p.active=1 AND p.status='published' AND COALESCE(json_extract(p.details_json,'$.availability'),'in_stock')='in_stock' AND COALESCE(json_extract(p.details_json,'$.priceStatus'),'approved')='approved'`).bind(w.target).first<{product_id:string;available:number}>();const d=config.drops.find(d=>d.productId===v?.product_id);ready=!!(v&&v.available>0&&(!d||dropAccess(d,access)));}
 return ready;
}
