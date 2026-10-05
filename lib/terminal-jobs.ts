import {getDbBinding,runtimeEnv} from './runtime-env';
import {z} from 'zod';
import {runSandboxQuotes} from './terminal-sandbox';
const key='terminal_sandbox_diagnostic';
export async function terminalStatus(){
 const row=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();
 return {configured:!!runtimeEnv().TERMINAL_AFRICA_TEST_SECRET_KEY,mode:'sandbox',bookingEnabled:false,job:row?JSON.parse(row.value):null};
}
export async function queueTerminalTest(){
 const db=getDbBinding();const job={status:'queued',id:crypto.randomUUID(),queuedAt:new Date().toISOString()};
 const result=await db.prepare(`INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE json_extract(store_meta.value,'$.status') NOT IN ('queued','running')`).bind(key,JSON.stringify(job)).run();
 return {queued:result.meta.changes>0,...await terminalStatus()};
}
export async function runTerminalJob(){
 const db=getDbBinding();const row=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();if(!row)return;
 const job=JSON.parse(row.value);if(job.status!=='queued'){
 if(job.status==='running'&&Date.now()-Date.parse(job.startedAt)>600000)await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(JSON.stringify({...job,status:'failed',error:'Interrupted sandbox run. You can retry.'}),key,row.value).run();return;}
 const running=JSON.stringify({...job,status:'running',startedAt:new Date().toISOString()});
 const claim=await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(running,key,row.value).run();if(!claim.meta.changes)return;
 let completed:unknown;try{completed={...job,status:'completed',report:await runSandboxQuotes(runtimeEnv().TERMINAL_AFRICA_TEST_SECRET_KEY||'',await pickupConfig())};}catch(e){completed={...job,status:'failed',error:e instanceof Error&&e.message.startsWith('Terminal sandbox packaging request failed')?e.message:'Sandbox connection failed. Check the test credential and retry.'};}
 await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(JSON.stringify(completed),key,running).run();
}

export async function pickupConfig(){const row=await getDbBinding().prepare("SELECT value FROM store_meta WHERE key='terminal_sandbox_pickup'").first<{value:string}>();const address=z.object({city:z.string().min(1).max(100),state:z.string().min(1).max(100),country:z.literal('NG'),line1:z.string().min(3).max(200),first_name:z.string().min(1).max(100),last_name:z.string().max(100),phone:z.string().min(10).max(20),email:z.string().email(),zip:z.string().regex(/^\d{6}$/)});return address.parse(JSON.parse(row?.value||'null'));}
