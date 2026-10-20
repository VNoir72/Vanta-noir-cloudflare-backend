import {getDbBinding,runtimeEnv} from './runtime-env';
import {queueEmail} from './commerce-db';
import {readProviderShipment,shipmentProgress,trackingUrl} from './shipment-progress';
import {applyShipbubbleShipment} from './shipbubble-webhook';
import {productDemand} from './product-demand';
import type {AutomationConfig} from './automation-policy';

async function owner(key:string,subject:string,body:string){const email=runtimeEnv().ADMIN_EMAIL;if(!email)throw Error('Owner notification email is not configured.');await queueEmail(key,email,subject,body);}
function daily(c:AutomationConfig){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:c.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date()),part=(name:string)=>parts.find(p=>p.type===name)?.value||'';return {day:[part('year'),part('month'),part('day')].join('-'),due:Number(part('hour'))>=c.summaryHour};}
export async function deliveryMonitoring(c:AutomationConfig){
 const db=getDbBinding();
 const rows=await db.prepare(`SELECT o.reference,m.value shipmentId FROM orders o JOIN store_meta m ON m.key='shipbubble-order:'||o.reference WHERE o.payment_status='paid' AND o.status IN ('paid','processing','shipped') AND COALESCE((SELECT value FROM store_meta WHERE key='shipment-check:'||o.reference),'')<? ORDER BY COALESCE((SELECT value FROM store_meta WHERE key='shipment-check:'||o.reference),'') LIMIT 10`).bind(new Date(Date.now()-15*60000).toISOString()).all<{reference:string;shipmentId:string}>();
 let synced=0,exceptions=0;const failed:string[]=[];
 for(const r of rows.results){
  // Rotate fairly even during a provider outage. This endpoint only reads shipments.
  await db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('shipment-check:'+r.reference,new Date().toISOString()).run();
  try{const s=await readProviderShipment(r.shipmentId);const result=await applyShipbubbleShipment(s);if(!result.linked)throw Error('Shipment mapping unavailable');synced++;}catch{failed.push(r.reference);}
  const progress=await shipmentProgress(r.reference);
  if(progress&&progress.status!=='completed'&&(progress.status==='cancelled'||Date.now()-Date.parse(progress.activityAt||progress.changedAt)>c.deliveryHours*3600000)){
   const kind=progress.status==='cancelled'?'cancelled':'no-progress';
   await owner('automation:delivery:'+progress.shipmentId+':'+kind+':'+progress.changedAt,'Delivery needs attention · '+r.reference,`Order: ${r.reference}\nCourier: ${progress.carrier}\nShipment: ${progress.shipmentId}\nLast status: ${progress.status}\nLast progress: ${progress.activityAt||progress.changedAt}\n${kind==='cancelled'?'The courier reported a cancelled shipment.':`No new delivery stage has been reported for ${c.deliveryHours} hours.`}\nOpen Delivery in Store admin to review. No order cancellation, refund or replacement shipment was created.`);exceptions++;
  }
 }
 if(failed.length)await owner('automation:delivery:sync:'+new Date().toISOString().slice(0,10),'Shipment tracking sync needs attention',`We could not refresh these shipments: ${failed.join(', ')}.\nPreviously saved tracking remains available. Check the Shipbubble connection in Store admin. No booking was retried.`);
 const notifications=await db.prepare(`SELECT o.reference,o.email,m.value FROM orders o JOIN store_meta m ON m.key='shipment-progress:'||o.reference WHERE o.payment_status='paid' AND o.status IN ('paid','processing','shipped','delivered') AND json_extract(m.value,'$.status')<>'cancelled' AND NOT EXISTS(SELECT 1 FROM email_outbox e WHERE e.event_key='automation:delivery:customer:'||json_extract(m.value,'$.shipmentId')||':'||json_extract(m.value,'$.status')) ORDER BY o.updated_at DESC LIMIT 30`).all<{reference:string;email:string;value:string}>();
 for(const r of notifications.results){const p=JSON.parse(r.value) as import('./shipment-progress').Progress;const labels={pending:'Shipment booked',confirmed:'Courier confirmed',picked_up:'Picked up',in_transit:'In transit',completed:'Delivered',cancelled:'Delivery needs attention'};await queueEmail('automation:delivery:customer:'+p.shipmentId+':'+p.status,r.email,labels[p.status]+' · '+r.reference,`Your Vanta Noir delivery has an update.\n\nTracking number: ${r.reference}\nStatus: ${labels[p.status]}\nCourier: ${p.carrier}\n\nTrack on Vanta Noir: ${trackingUrl(r.reference)}\nUse your checkout email or phone to view your delivery progress. Courier scans may take time to appear.`);}
 return {checked:rows.results.length,synced,exceptions,failed,notifications:notifications.results.length};
}
export async function securityMonitoring(){
 const db=getDbBinding(),day=new Date().toISOString().slice(0,10);
 const diagnostics=await db.prepare(`SELECT substr(key,20) reference FROM store_meta WHERE key LIKE 'payment-diagnostic:%' AND datetime(json_extract(value,'$.at'))>=datetime('now','-24 hours') AND (json_extract(value,'$.referenceMatches')=0 OR (json_extract(value,'$.status')='success' AND json_extract(value,'$.currency')<>'NGN') OR (json_extract(value,'$.stage')='apply' AND json_extract(value,'$.error') IS NOT NULL)) LIMIT 50`).all<{reference:string}>();
 for(const r of diagnostics.results)await owner('automation:security:payment:'+r.reference+':'+day,'Payment verification needs review · '+r.reference,`Payment verification reported a reference, currency or payment-application discrepancy for ${r.reference}.\nReview Payments in Store admin before fulfilment. This is a review flag, not a finding of fraud. No customer account was suspended.`);
 const rate=await db.prepare("SELECT key,json_extract(value,'$.count') count FROM store_meta WHERE key LIKE 'security-rate:%' AND datetime(json_extract(value,'$.at'))>=datetime('now','-24 hours') AND json_extract(value,'$.count')>=5 ORDER BY key LIMIT 30").all<{key:string;count:number}>();
 for(const r of rate.results)await owner('automation:security:'+r.key,'Repeated request limits · Vanta Noir',`${r.count} request windows exceeded a rate limit in ${r.key.replace('security-rate:','')}.\nExisting request protection blocked excess requests. Review activity in Store admin. No account was automatically suspended.`);
 await db.prepare("DELETE FROM store_meta WHERE key LIKE 'security-rate:%' AND datetime(json_extract(value,'$.at'))<datetime('now','-14 days')").run();
 return {paymentFlags:diagnostics.results.length,rateLimitWindows:rate.results.length};
}
export async function demandDigest(c:AutomationConfig){
 const time=daily(c);if(!time.due)return {waitingUntilHour:c.summaryHour,timezone:c.timezone};
 const rows=(await productDemand()).filter(p=>p.recentLikes>0||p.confirmedAlerts>0).sort((a,b)=>(b.recentLikes+b.confirmedAlerts)-(a.recentLikes+a.confirmedAlerts)).slice(0,10);
 if(rows.length)await owner('automation:interest:'+time.day,'Product interest · Vanta Noir · '+time.day,`Product-interest digest (${c.timezone})\nLikes cover the last 30 days; alerts are current confirmed subscriptions. These signals are not sales or production commitments.\n\n`+rows.map(p=>`${p.name} · ${p.status}\nRecent interested visitors: ${p.recentLikes} · Confirmed alerts: ${p.confirmedAlerts} · Available stock: ${p.stock}\nSaved preferences (all-time): ${p.preferences.slice(0,5).map(v=>`${v.color}${v.size?' / '+v.size:''}: ${v.likes}`).join('; ')||'None'}`).join('\n\n')+'\n\nOpen Product demand in Store admin to review.');
 return {day:time.day,products:rows.length};
}
