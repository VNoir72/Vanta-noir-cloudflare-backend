import {getDbBinding,runtimeEnv} from './runtime-env';
const events=['email.delivered','email.delivery_delayed','email.bounced','email.failed','email.complained','email.suppressed'];
const configKey='email-webhook-config';
const bytes=(text:string)=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
const base64=(data:Uint8Array)=>btoa(String.fromCharCode(...data));
async function encryptionKey(){
 const secret=runtimeEnv().RESEND_API_KEY;if(!secret)throw new Error('Email service is not configured.');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('email-webhook-storage:'+secret));
 return crypto.subtle.importKey('raw',digest,'AES-GCM',false,['encrypt','decrypt']);
}
async function saveSecret(secret:string,id='manual'){
 if(!/^whsec_[A-Za-z0-9+/=]+$/.test(secret)||bytes(secret.slice(6)).length<16)throw new Error('Enter a valid Resend webhook signing secret.');
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await encryptionKey(),new TextEncoder().encode(secret)));
 await getDbBinding().prepare('INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(configKey,JSON.stringify({state:'connected',id,iv:base64(iv),encrypted:base64(encrypted),at:new Date().toISOString()})).run();
}
export async function configureEmailWebhook(secret:string){await saveSecret(secret.trim());}
async function webhookSecret(){
 const env=runtimeEnv();if(env.RESEND_WEBHOOK_SECRET)return env.RESEND_WEBHOOK_SECRET;
 const row=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind(configKey).first<{value:string}>();
 if(!row)return null;const c=JSON.parse(row.value);if(!c.encrypted)return null;
 try{return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(c.iv)},await encryptionKey(),bytes(c.encrypted)));}catch{return null;}
}
export async function emailTrackingState(){
 const row=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind(configKey).first<{value:string}>();
 const c=row?JSON.parse(row.value):{};
 const last=await getDbBinding().prepare("SELECT value FROM store_meta WHERE key='email-webhook-last-event'").first<{value:string}>();
 return {connected:!!await webhookSecret(),state:c.state||'not_connected',message:c.message||'',endpoint:runtimeEnv().EMAIL_WEBHOOK_URL||'',lastEventAt:last?.value||null};
}
export async function connectEmailTracking(force=false){
 const db=getDbBinding(),env=runtimeEnv();if(!env.EMAIL_WEBHOOK_URL||!env.RESEND_API_KEY)return;
 if(await webhookSecret())return;
 const prior=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(configKey).first<{value:string}>();
 if(prior&&!force)return;
 const token=crypto.randomUUID(),now=Date.now();
 const claim=await db.prepare("INSERT INTO store_meta(key,value) VALUES('email-webhook-setup-lock',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(json_extract(store_meta.value,'$.at') AS INTEGER)<?").bind(JSON.stringify({token,at:now}),now-60000).run();if(!claim.meta.changes)return;
 const state=async(message:string)=>db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(configKey,JSON.stringify({state:'setup_required',message,at:new Date().toISOString()})).run();
 const request=(path:string,init:RequestInit={})=>fetch('https://api.resend.com'+path,{...init,headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(12000)});
 try{
  let after='';
  for(let page=0;page<10;page++){
   const response=await request('/webhooks?limit=100'+(after?'&after='+encodeURIComponent(after):''));
   if(!response.ok){await state(response.status===401||response.status===403?'Your existing key cannot manage webhooks. Add the endpoint in Resend and paste its signing secret below. Email sending is unchanged.':'Automatic connection did not complete. Retry or use the manual setup below.');return;}
   const list=await response.json() as {data:Array<{id:string;endpoint:string}>;has_more?:boolean};
   const existing=list.data.find(w=>w.endpoint===env.EMAIL_WEBHOOK_URL);
   if(existing){await state('This endpoint already exists in Resend. Paste its signing secret below; existing webhooks were not changed.');return;}
   if(!list.has_more)break;
   if(page===9||!list.data.length){await state('Review existing webhooks in Resend and use manual setup below.');return;}after=list.data[list.data.length-1].id;
  }
  // Persist before the remote write: a crash cannot repeatedly create endpoints.
  await state('Connection was started. If it did not finish, check Resend for this endpoint before retrying.');
  const response=await request('/webhooks',{method:'POST',body:JSON.stringify({endpoint:env.EMAIL_WEBHOOK_URL,events})});
  if(!response.ok){await state('Resend did not accept automatic setup. Add this endpoint in Resend and paste its signing secret below.');return;}
  const data=await response.json() as {id:string;signing_secret:string};await saveSecret(data.signing_secret,data.id);
 }catch{await state('Automatic connection could not finish. Check Resend for this endpoint before retrying or use manual setup.');}
}
export async function verifyEmailWebhook(raw:string,headers:Headers){
 const secret=await webhookSecret(),id=headers.get('svix-id'),timestamp=headers.get('svix-timestamp'),signatures=headers.get('svix-signature');
 if(!secret||!id||id.length>200||!timestamp||!/^\d+$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300||!signatures||signatures.length>2000)return false;
 try{const key=await crypto.subtle.importKey('raw',bytes(secret.replace(/^whsec_/,'')),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 for(const part of signatures.split(' ')){const [version,signature]=part.split(',');if(version==='v1'&&signature&&await crypto.subtle.verify('HMAC',key,bytes(signature),new TextEncoder().encode(`${id}.${timestamp}.${raw}`)))return true;}
 }catch{/* Invalid signatures fail closed. */}return false;
}
export async function recordEmailEvent(payload:unknown){
 const e=payload as {type?:string;created_at?:string;data?:{email_id?:string}};
 if(!e||!events.includes(e.type||''))return;
 const providerId=e.data?.email_id;if(typeof providerId!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(providerId))throw new Error('Invalid email identifier.');
 const at=Date.parse(e.created_at||'');if(!Number.isFinite(at)||at>Date.now()+300000)throw new Error('Invalid event timestamp.');
 const status=e.type!.slice(6),priority=status==='complained'?5:status==='bounced'||status==='suppressed'?4:status==='failed'?3:status==='delivered'?2:1;
 const db=getDbBinding();await db.batch([
 db.prepare("INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(json_extract(excluded.value,'$.priority') AS INTEGER)>CAST(json_extract(store_meta.value,'$.priority') AS INTEGER) OR (json_extract(excluded.value,'$.priority')=json_extract(store_meta.value,'$.priority') AND json_extract(excluded.value,'$.at')>json_extract(store_meta.value,'$.at'))").bind('email-event:'+providerId,JSON.stringify({status,priority,at,receivedAt:new Date().toISOString()})),
 db.prepare("INSERT INTO store_meta(key,value) VALUES('email-webhook-last-event',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(new Date().toISOString())]);
}
export async function emailDeliveryData(reference=''){
 const rows=await getDbBinding().prepare(`SELECT e.id,e.event_key AS eventKey,e.recipient,e.status,e.attempts,e.last_error AS lastError,e.created_at AS createdAt,e.sent_at AS sentAt,
 json_extract(p.value,'$.providerId') AS providerId,json_extract(d.value,'$.status') AS deliveryStatus
 FROM email_outbox e LEFT JOIN store_meta p ON p.key='email-provider:'||e.id
 LEFT JOIN store_meta d ON d.key='email-event:'||json_extract(p.value,'$.providerId')
 WHERE (e.event_key LIKE 'order:%:payment' OR e.event_key LIKE 'order:%:manual-confirmation:%') AND (?='' OR e.event_key LIKE 'order:'||?||':%')
 ORDER BY e.created_at DESC,e.id DESC LIMIT 50`).bind(reference,reference).all();
 return {tracking:await emailTrackingState(),emails:rows.results};
}
export async function resendOrderConfirmation(input:{reference:string;recipient:string;requestId:string},actor:string){
 const db=getDbBinding(),key=`order:${input.reference}:manual-confirmation:${input.requestId}`;
 const old=await db.prepare('SELECT id,recipient FROM email_outbox WHERE event_key=?').bind(key).first<{id:string;recipient:string}>();
 if(old){if(old.recipient!==input.recipient)throw new Error('This resend request used a different recipient. Refresh before retrying.');return {queued:true,id:old.id};}
 const order=await db.prepare("SELECT id,status FROM orders WHERE reference=? AND payment_status='paid'").bind(input.reference).first<{id:string;status:string}>();
 if(!order)throw new Error('Only a verified paid order can receive a payment confirmation.');
 const original=await db.prepare('SELECT subject,body FROM email_outbox WHERE event_key=?').bind(`order:${input.reference}:payment`).first<{subject:string;body:string}>();
 if(!original)throw new Error('The original confirmation is still being prepared. Try again shortly.');
 const messageId=crypto.randomUUID(),at=Date.now(),lockKey='email-resend:'+input.reference;
 const result=await db.batch([
 db.prepare(`INSERT INTO store_meta(key,value) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM email_outbox WHERE (event_key=? OR event_key LIKE ?) AND status IN ('pending','sending'))
 ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(json_extract(store_meta.value,'$.at') AS INTEGER)<?`).bind(lockKey,JSON.stringify({at,messageId}),`order:${input.reference}:payment`,`order:${input.reference}:manual-confirmation:%`,at-600000),
 db.prepare(`INSERT OR IGNORE INTO email_outbox(id,event_key,recipient,subject,body) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM store_meta WHERE key=? AND json_extract(value,'$.messageId')=?)`).bind(messageId,key,input.recipient,original.subject,`Requested copy of the original payment confirmation.\nCurrent order status: ${order.status.replaceAll('_',' ')}.\n\n${original.body}`,lockKey,messageId),
 db.prepare("INSERT INTO admin_audit(actor,action,entity,detail) SELECT ?,'resend order confirmation',?,? WHERE EXISTS(SELECT 1 FROM email_outbox WHERE id=?)").bind(actor,input.reference,`Recipient: ${input.recipient}; message: ${messageId}`,messageId)]);
 if(!result[1].meta.changes){const existing=await db.prepare('SELECT id,recipient FROM email_outbox WHERE event_key=?').bind(key).first<{id:string;recipient:string}>();if(existing){if(existing.recipient!==input.recipient)throw new Error('This resend request used a different recipient. Refresh before retrying.');return {queued:true,id:existing.id};}throw new Error('A confirmation is already queued or was resent recently. Wait 10 minutes before requesting another copy.');}
 return {queued:true,id:messageId};
}
