import {getDbBinding,runtimeEnv} from './runtime-env';
import {getPickupDetails} from './terminal-pickup';
const key='terminal_live_connection';
export async function liveStatus(){
 const row=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();
 return {mode:'live',configured:!!runtimeEnv().TERMINAL_AFRICA_LIVE_SECRET_KEY?.trim(),bookingEnabled:false,checkoutEnabled:false,pickupReady:!!await getPickupDetails(),check:row?JSON.parse(row.value):null};
}
export async function queueLiveCheck(){
 const job={status:'queued',id:crypto.randomUUID(),queuedAt:new Date().toISOString()};
 await getDbBinding().prepare(`INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE json_extract(store_meta.value,'$.status') NOT IN ('queued','running')`).bind(key,JSON.stringify(job)).run();
 return liveStatus();
}
export async function verifyLiveCredential(secret:string){
 if(!secret.trim())throw Error('Save the Terminal live secret in Cloudflare first.');
 let response:Response;
 try{response=await fetch('https://api.terminal.africa/v1/users/wallet',{method:'GET',headers:{Authorization:`Bearer ${secret.trim()}`,Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(15000)});}catch{throw Error('Terminal could not be reached. Retry the connection check.');}
 if(response.status===401||response.status===403){
  // Inspect only a bounded error response; persist fixed classifications, never provider text.
  let reason='';const reader=response.body?.getReader();
  if(reader){try{let text='',bytes=0;const decoder=new TextDecoder();while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>8192)break;text+=decoder.decode(part.value,{stream:true});}const body=JSON.parse(text);reason=typeof body?.message==='string'?body.message.toLowerCase():'';}catch{}finally{await reader.cancel().catch(()=>{});}}
  const status=`Terminal HTTP ${response.status}. `;
  if(/kyc|identity verification|account.{0,30}(not verified|unverified|pending verification)|verif(y|ication).{0,30}(account|identity)/.test(reason))throw Error(status+'Terminal reports an account-verification restriction. Complete or resolve KYC in Terminal Africa.');
  if(/invalid.{0,20}(key|token|credential)|expired.{0,20}(key|token)|unauthori[sz]ed/.test(reason))throw Error(status+'Terminal reports an authentication failure. Check that the saved live secret is current and copied completely.');
  if(response.status===401)throw Error(status+'Authentication was not accepted. Check the current live secret; this response alone does not establish a KYC problem.');
  throw Error(status+'Access to the wallet endpoint was forbidden. Account permissions, verification or provider security restrictions need review; this does not prove the key is wrong.');
 }
 if(!response.ok)throw Error('Terminal could not verify the account. Retry later or contact Terminal support.');
 const body=await response.json().catch(()=>null) as any;
 if(body?.status!==true||typeof body?.data?.active!=='boolean')throw Error('Terminal returned an unexpected account response.');
 // Only persist these flags. Never retain bank details, provider bodies or credentials.
 return {authenticated:true,walletActive:body.data.active,walletEnabled:body.data.wallet_enabled===true};
}
export async function runLiveCheck(){
 const db=getDbBinding();const row=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();if(!row)return;
 const job=JSON.parse(row.value);
 if(job.status==='running'&&Date.now()-Date.parse(job.startedAt)>120000){await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(JSON.stringify({...job,status:'failed',error:'Connection check interrupted. Retry.'}),key,row.value).run();return;}
 if(job.status!=='queued')return;
 const running=JSON.stringify({...job,status:'running',startedAt:new Date().toISOString()});
 const claim=await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(running,key,row.value).run();if(!claim.meta.changes)return;
 let result;try{result={...job,status:'connected',checkedAt:new Date().toISOString(),...await verifyLiveCredential(runtimeEnv().TERMINAL_AFRICA_LIVE_SECRET_KEY||'')};}catch(e){result={...job,status:'failed',checkedAt:new Date().toISOString(),error:e instanceof Error?e.message:'Connection check failed.'};}
 await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(JSON.stringify(result),key,running).run();
}
