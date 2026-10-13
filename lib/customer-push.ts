import {appControlsSnapshot} from './app-controls';
import {memberWatchReady} from './app-members';
import {getDbBinding} from './runtime-env';
import {rateLimit} from './rate-limit';
import {receiptDigest} from './receipt-access';
type Device={customerId:string;token:string;seen:Record<string,string>;ticketIds?:string[];lastSeen?:number};
async function states(customerId:string){const db=getDbBinding();const rows=await db.prepare('SELECT o.reference,o.status,o.payment_status AS paymentStatus FROM app_customer_orders a JOIN orders o ON o.reference=a.reference WHERE a.customer_id=? ORDER BY o.created_at DESC LIMIT 30').bind(customerId).all<{reference:string;status:string;paymentStatus:string}>();return Object.fromEntries(rows.results.map(o=>[o.reference,o.paymentStatus+':'+o.status]));}
export async function registerPush(customerId:string,token:string,remove=false){
 const db=getDbBinding(),key='push-device:'+await receiptDigest(token);
 if(remove){const row=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();if(row&&JSON.parse(row.value).customerId===customerId)await db.prepare('DELETE FROM store_meta WHERE key=?').bind(key).run();return;}
 if(!await rateLimit(new Request('https://internal.invalid',{headers:{'cf-connecting-ip':customerId}}),'push-registration',10,3600))throw Error('Please wait before registering another device.');
 const value:Device={customerId,token,seen:await states(customerId),lastSeen:Date.now()};
 const result=await db.prepare(`INSERT INTO store_meta(key,value) SELECT ?,? WHERE
 EXISTS(SELECT 1 FROM store_meta WHERE key=? AND json_extract(value,'$.customerId')=?) OR
 (SELECT COUNT(*) FROM store_meta WHERE key LIKE 'push-device:%' AND json_extract(value,'$.customerId')=? AND COALESCE(json_extract(value,'$.lastSeen'),0)>?)<5
 ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE json_extract(store_meta.value,'$.customerId')=?`)
 .bind(key,JSON.stringify(value),key,customerId,customerId,Date.now()-90*86400000,customerId).run();
 if(!result.meta.changes)throw Error('Device registration limit reached. Remove an old device first.');
}
export async function sendOrderPushUpdates(){
 const db=getDbBinding();
 await db.prepare("DELETE FROM store_meta WHERE key LIKE 'push-device:%' AND COALESCE(json_extract(value,'$.lastSeen'),0)<?").bind(Date.now()-90*86400000).run();
 const cursor=await db.prepare("SELECT value FROM store_meta WHERE key='push-cursor'").first<{value:string}>();
 let rows=await db.prepare("SELECT key,value FROM store_meta WHERE key LIKE 'push-device:%' AND key>? ORDER BY key LIMIT 6").bind(cursor?.value||'').all<{key:string;value:string}>();
 if(!rows.results.length)rows=await db.prepare("SELECT key,value FROM store_meta WHERE key LIKE 'push-device:%' ORDER BY key LIMIT 6").all<{key:string;value:string}>();
 if(rows.results.length)await db.prepare("INSERT INTO store_meta(key,value) VALUES('push-cursor',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(rows.results.at(-1)!.key).run();
 for(const row of rows.results){try{
  const device=JSON.parse(row.value) as Device;
  const member=await db.prepare('SELECT email FROM app_customers WHERE id=?').bind(device.customerId).first<{email:string}>();
  if(!member){await db.prepare('DELETE FROM store_meta WHERE key=?').bind(row.key).run();continue;}
  if(device.ticketIds?.length){const r=await fetch('https://exp.host/--/api/v2/push/getReceipts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:device.ticketIds}),signal:AbortSignal.timeout(10000)});if(r.ok){const data=await r.json() as {data:Record<string,{status:string;details?:{error:string}}>};if(Object.values(data.data||{}).some(v=>v.details?.error==='DeviceNotRegistered')){await db.prepare('DELETE FROM store_meta WHERE key=?').bind(row.key).run();continue;}}}
  let ready:{results:{key:string;value:string}[]}={results:[]};
  try {
  if((await appControlsSnapshot()).config.enabled)ready=await db.prepare("SELECT key,value FROM store_meta WHERE key LIKE ? AND json_extract(value,'$.status')='ready' ORDER BY key LIMIT 100").bind('app-watch:'+device.customerId+':%').all<{key:string;value:string}>();
  const candidates=ready.results.filter(r=>device.seen[r.key]!==JSON.parse(r.value).readyAt).slice(0,5);
  const alerts:{key:string;value:string}[]=[];for(const candidate of candidates)if(await memberWatchReady(JSON.parse(candidate.value),member.email))alerts.push(candidate);
  if(alerts.length){const sent=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(alerts.map(()=>({to:device.token,title:'Vanta Noir app alert',body:'A drop or garment you follow is available. Open App benefits to check availability.',channelId:'orders',data:{appBenefits:true},sound:'default'}))),signal:AbortSignal.timeout(10000)});if(sent.ok){const result=await sent.json() as {data:{status:string;id?:string;details?:{error:string}}[]};if(result.data?.some(t=>t.details?.error==='DeviceNotRegistered')){await db.prepare('DELETE FROM store_meta WHERE key=? AND value=?').bind(row.key,row.value).run();continue;}result.data?.forEach((t,i)=>{if(t.status==='ok'&&alerts[i]){device.seen[alerts[i].key]=JSON.parse(alerts[i].value).readyAt;if(t.id)device.ticketIds=[...(device.ticketIds||[]).slice(-9),t.id];}});const changed=JSON.stringify(device);const update=await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(changed,row.key,row.value).run();if(update.meta.changes)row.value=changed;}}
  }catch{/* Optional drop alerts never interrupt order updates. */}
  const current=await states(device.customerId);const changed=Object.entries(current).filter(([ref,status])=>device.seen[ref]!==status).slice(0,5);if(!changed.length)continue;
  const response=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(changed.map(([reference])=>({to:device.token,title:'Vanta Noir order update',body:'Your order has an update. Open Vanta Noir to view it.',channelId:'orders',data:{orderReference:reference},sound:'default'}))),signal:AbortSignal.timeout(10000)});
  if(!response.ok)continue;
  const result=await response.json() as {data:{status:string;id?:string;details?:{error:string}}[]};
  if(result.data?.some(ticket=>ticket.details?.error==='DeviceNotRegistered')){await db.prepare('DELETE FROM store_meta WHERE key=?').bind(row.key).run();continue;}
  const ticketIds:string[]=[];result.data?.forEach((ticket,i)=>{if(ticket.status==='ok'&&changed[i]){device.seen[changed[i][0]]=changed[i][1];if(ticket.id)ticketIds.push(ticket.id);}});
  // Keep only recent order snapshots and provider receipt IDs; never store card data.
  device.seen=Object.fromEntries(Object.entries(device.seen).filter(([ref])=>ref in current||ready.results.some(r=>r.key===ref)));device.ticketIds=[...(device.ticketIds||[]),...ticketIds].slice(-15);
  await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(JSON.stringify(device),row.key,row.value).run();
 }catch{/* A device/provider failure must not interrupt order maintenance. */}}
}
