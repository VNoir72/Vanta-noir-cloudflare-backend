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
 if(response.status===401||response.status===403)throw Error('Terminal rejected the live credential. Check the live secret and account access.');
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
