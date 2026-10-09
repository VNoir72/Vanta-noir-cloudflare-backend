import {runtimeEnv,getDbBinding,shipbubbleCheckoutEnabled} from './runtime-env';
import {providerJson} from './shipping-comparison';
import {getPickupDetails} from './terminal-pickup';
import {packagingProfiles} from './parcel-profiles';
const connectionKey='shipbubble-live-connection';
export async function shipbubbleReadiness(){
 const db=getDbBinding();
 const row=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(connectionKey).first<{value:string}>();
 const last=await db.prepare("SELECT value FROM store_meta WHERE key='shipbubble-last-webhook'").first<{value:string}>();
 const counts=await db.prepare("SELECT COUNT(*) AS saved,COALESCE(SUM(CASE WHEN json_extract(value,'$.data.measured')=1 THEN 1 ELSE 0 END),0) AS measured FROM store_meta WHERE key LIKE 'parcel-item:%'").first<{saved:number;measured:number}>();
 const packaging=await packagingProfiles();
 return {provider:'shipbubble',keyConfigured:runtimeEnv().SHIPBUBBLE_API_KEY?.startsWith('sb_prod_')===true,checkoutEnabled:shipbubbleCheckoutEnabled(),bookingEnabled:true,bookingMode:'owner-confirmed bulk dispatch',pickupReady:!!await getPickupDetails(),itemProfiles:counts,measuredPackaging:packaging.data.filter((p:{measured:boolean})=>p.measured).length,connection:row?JSON.parse(row.value):null,lastWebhook:last?JSON.parse(last.value):null,webhookPath:'/api/shipbubble/webhook'};
}
export async function checkShipbubbleLive(){
 const key=runtimeEnv().SHIPBUBBLE_API_KEY||'';
 let result:{status:string;checkedAt:string;error?:string;walletFunded?:boolean};
 try{
  if(!key.startsWith('sb_prod_'))throw Error('A production key is required.');
  const data=await providerJson('https://api.shipbubble.com/v1/shipping/wallet/balance',key,undefined) as {balance?:unknown;currency?:unknown};
  if(data?.currency!=='NGN'||typeof data.balance!=='number'||!Number.isFinite(data.balance))throw Error('Unexpected wallet response.');
  result={status:'connected',checkedAt:new Date().toISOString(),walletFunded:data.balance>0};
 }catch(e){const message=e instanceof Error?e.message:'';result={status:'failed',checkedAt:new Date().toISOString(),error:/^Shipping provider HTTP \d{3}\.$/.test(message)?message:'Production account could not be verified. Check the live key and API access in Shipbubble.'};}
 await getDbBinding().prepare('INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(connectionKey,JSON.stringify(result)).run();
 return shipbubbleReadiness();
}

/** Read-only account verification job; never creates or books a shipment. */
export async function runShipbubbleLiveCheck(){
 const db=getDbBinding(),jobKey='shipbubble-live-check-job';
 const row=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(jobKey).first<{value:string}>();
 if(!row)return;
 const job=JSON.parse(row.value);
 if(job.status==='running'&&Date.now()-Date.parse(job.startedAt)>120000){
  await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(JSON.stringify({...job,status:'failed',error:'Connection check interrupted. Retry.'}),jobKey,row.value).run();return;
 }
 if(job.status!=='queued')return;
 const running=JSON.stringify({...job,status:'running',startedAt:new Date().toISOString()});
 const claim=await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(running,jobKey,row.value).run();
 if(!claim.meta.changes)return;
 await checkShipbubbleLive();
 await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(JSON.stringify({...job,status:'completed',completedAt:new Date().toISOString()}),jobKey,running).run();
}
