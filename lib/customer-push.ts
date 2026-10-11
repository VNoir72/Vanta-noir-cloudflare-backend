import {getDbBinding} from './runtime-env';
import {receiptDigest} from './receipt-access';
type Device={customerId:string;token:string;seen:Record<string,string>;ticketIds?:string[]};
async function states(customerId:string){const db=getDbBinding();const rows=await db.prepare('SELECT o.reference,o.status,o.payment_status AS paymentStatus FROM app_customer_orders a JOIN orders o ON o.reference=a.reference WHERE a.customer_id=? ORDER BY o.created_at DESC LIMIT 30').bind(customerId).all<{reference:string;status:string;paymentStatus:string}>();return Object.fromEntries(rows.results.map(o=>[o.reference,o.paymentStatus+':'+o.status]));}
export async function registerPush(customerId:string,token:string,remove=false){
 const db=getDbBinding(),key='push-device:'+await receiptDigest(token);
 if(remove){const row=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();if(row&&JSON.parse(row.value).customerId===customerId)await db.prepare('DELETE FROM store_meta WHERE key=?').bind(key).run();return;}
 const value:Device={customerId,token,seen:await states(customerId)};
 await db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(value)).run();
}
export async function sendOrderPushUpdates(){
 const db=getDbBinding();
 const cursor=await db.prepare("SELECT value FROM store_meta WHERE key='push-cursor'").first<{value:string}>();
 let rows=await db.prepare("SELECT key,value FROM store_meta WHERE key LIKE 'push-device:%' AND key>? ORDER BY key LIMIT 6").bind(cursor?.value||'').all<{key:string;value:string}>();
 if(!rows.results.length)rows=await db.prepare("SELECT key,value FROM store_meta WHERE key LIKE 'push-device:%' ORDER BY key LIMIT 6").all<{key:string;value:string}>();
 if(rows.results.length)await db.prepare("INSERT INTO store_meta(key,value) VALUES('push-cursor',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(rows.results.at(-1)!.key).run();
 for(const row of rows.results){try{
  const device=JSON.parse(row.value) as Device;
  if(!await db.prepare('SELECT id FROM app_customers WHERE id=?').bind(device.customerId).first()){await db.prepare('DELETE FROM store_meta WHERE key=?').bind(row.key).run();continue;}
  if(device.ticketIds?.length){const r=await fetch('https://exp.host/--/api/v2/push/getReceipts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:device.ticketIds}),signal:AbortSignal.timeout(10000)});if(r.ok){const data=await r.json() as {data:Record<string,{status:string;details?:{error:string}}>};if(Object.values(data.data||{}).some(v=>v.details?.error==='DeviceNotRegistered')){await db.prepare('DELETE FROM store_meta WHERE key=?').bind(row.key).run();continue;}}}
  const current=await states(device.customerId);const changed=Object.entries(current).filter(([ref,status])=>device.seen[ref]!==status).slice(0,5);if(!changed.length)continue;
  const response=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(changed.map(([reference])=>({to:device.token,title:'Vanta Noir order update',body:'Your order has an update. Open Vanta Noir to view it.',channelId:'orders',data:{orderReference:reference},sound:'default'}))),signal:AbortSignal.timeout(10000)});
  if(!response.ok)continue;
  const result=await response.json() as {data:{status:string;id?:string;details?:{error:string}}[]};
  if(result.data?.some(ticket=>ticket.details?.error==='DeviceNotRegistered')){await db.prepare('DELETE FROM store_meta WHERE key=?').bind(row.key).run();continue;}
  const ticketIds:string[]=[];result.data?.forEach((ticket,i)=>{if(ticket.status==='ok'&&changed[i]){device.seen[changed[i][0]]=changed[i][1];if(ticket.id)ticketIds.push(ticket.id);}});
  // Keep only recent order snapshots and provider receipt IDs; never store card data.
  device.seen=Object.fromEntries(Object.entries(device.seen).filter(([ref])=>ref in current));device.ticketIds=ticketIds;
  await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(JSON.stringify(device),row.key,row.value).run();
 }catch{/* A device/provider failure must not interrupt order maintenance. */}}
}
