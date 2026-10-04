import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {build} from 'esbuild';
const output=await build({entryPoints:['lib/admin-ga4.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'test-env',setup(b){b.onResolve({filter:/runtime-env$/},()=>({path:'test-env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export function runtimeEnv(){return globalThis.__ga4env||{};}'}));}}]});
const {conversionReport}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const range={from:'2026-09-02',to:'2026-09-03',previousFrom:'2026-08-31',previousTo:'2026-09-01',days:2,endExclusive:'2026-09-04'};
test('GA4 connection remains honest when absent, weights measured conversion by sessions, and caches requests',async()=>{
 assert.equal((await conversionReport(range)).status,'not_configured');
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 globalThis.__ga4env={GA4_PROPERTY_ID:'12345',GA4_SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'test@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})})};
 const original=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async(url,options)=>{calls++;if(url.includes('oauth2')){assert.ok(options.body.get('assertion'));return Response.json({access_token:'test-token'});}assert.equal(options.headers.Authorization,'Bearer test-token');assert.equal(JSON.parse(options.body).metrics[1].name,'sessionKeyEventRate:purchase');return Response.json({metadata:{timeZone:'Africa/Lagos'},rows:[['20260831',100,.01],['20260901',100,.03],['20260902',10,.1],['20260903',90,0]].map(([date,count,rate])=>({dimensionValues:[{value:date}],metricValues:[{value:String(count)},{value:String(rate)}]}))});};
 const result=await conversionReport(range);assert.equal(result.status,'connected');assert.equal(result.current,1);assert.equal(result.previous,2);assert.equal(result.sessions,100);assert.equal(result.daily['2026-09-02'],10);assert.equal(result.timeZone,'Africa/Lagos');await conversionReport(range);assert.equal(calls,2);
 globalThis.fetch=async()=>Response.json({error:'Private provider detail'},{status:403});const failed=await conversionReport({...range,to:'2026-09-04'});assert.equal(failed.status,'unavailable');assert.equal(failed.current,null);assert.ok(!failed.message.includes('Private provider detail'));
 }finally{globalThis.fetch=original;delete globalThis.__ga4env;}
});
