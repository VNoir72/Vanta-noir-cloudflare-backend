import {shippingProviders} from './shipping-policy';
import {getDbBinding,runtimeEnv,shipbubbleCheckoutEnabled} from './runtime-env';
import {pickupConfig} from './terminal-jobs';
import {destinations} from './terminal-sandbox';
import {compareRates,shipbubbleSandbox,terminalSandbox} from './shipping-comparison';
const key='shipping_comparison_sandbox';
export async function comparisonStatus(){
 const row=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();
 const env=runtimeEnv();
 return {live:{shipbubbleCheckoutEnabled:shipbubbleCheckoutEnabled(),providers:shippingProviders},mode:'sandbox',checkoutEnabled:false,bookingEnabled:false,configured:{terminal:!!env.TERMINAL_AFRICA_TEST_SECRET_KEY,shipbubble:!!env.SHIPBUBBLE_TEST_API_KEY},job:row?JSON.parse(row.value):null};
}
export async function queueComparison(){
 const job={id:crypto.randomUUID(),status:'queued',queuedAt:new Date().toISOString()};
 await getDbBinding().prepare(`INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE json_extract(store_meta.value,'$.status') NOT IN ('queued','running')`).bind(key,JSON.stringify(job)).run();
 return comparisonStatus();
}
export async function runComparisonJob(){
 const db=getDbBinding(),row=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();if(!row)return;
 const job=JSON.parse(row.value);
 if(job.status!=='queued'){
  if(job.status==='running'&&Date.now()-Date.parse(job.startedAt)>600000)await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(JSON.stringify({...job,status:'failed',error:'Test interrupted. Please retry.'}),key,row.value).run();
  return;
 }
 const running=JSON.stringify({...job,status:'running',startedAt:new Date().toISOString()});
 const lock=await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(running,key,row.value).run();if(!lock.meta.changes)return;
 let result:unknown;
 try{
  const pickup=await pickupConfig(),env=runtimeEnv(),results=[];
  const parcel={weightKg:5,lengthCm:53.34,widthCm:30.48,heightCm:12.7,valueNaira:10000};
  for(const d of destinations.slice(0,4)){
   // Use only the separate sandbox contact and synthetic destinations. Never query customer orders.
   const destination={...pickup,line1:d.line1,city:d.city,state:d.state,zip:d.zip};
   const report=await compareRates(()=>terminalSandbox(env.TERMINAL_AFRICA_TEST_SECRET_KEY||'',pickup,destination,parcel),()=>shipbubbleSandbox(env.SHIPBUBBLE_TEST_API_KEY||'',pickup,destination,parcel));
   results.push({destination:d.label,...report});
  }
  result={...job,status:'completed',completedAt:new Date().toISOString(),results,allProvidersReturnedRates:results.every(r=>r.providers.every(p=>p.status==='quoted'))};
 }catch{result={...job,status:'failed',error:'Check the separate sandbox pickup details and test keys, then retry.'};}
 await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(JSON.stringify(result),key,running).run();
}
