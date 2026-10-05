import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['lib/terminal-sandbox.ts'],outfile:'work/terminal-sandbox.mjs',bundle:true,format:'esm',platform:'node'});
const {runSandboxQuotes,sandboxRequest,inchesToCm}=await import('../work/terminal-sandbox.mjs');
const pickup={line1:'Synthetic pickup',city:'Kaduna',state:'Kaduna',country:'NG'};
test('sandbox quotes stay on sandbox, never book, preserve packed weight and dimensions',async()=>{
 const calls=[];const report=await runSandboxQuotes('test-only',pickup,async(url,init)=>{calls.push(url);assert.ok(url.startsWith('https://sandbox.terminal.africa/v1/'));assert.equal(init.redirect,'error');const body=JSON.parse(init.body);
 if(url.endsWith('/packaging')){assert.deepEqual([body.length,body.width,body.height],[53.34,30.48,12.7]);return Response.json({status:true,data:{packaging_id:'PA-test'}});}
 assert.equal(body.persist_data,false);assert.equal(body.cash_on_delivery,false);assert.equal(body.parcel.items[0].weight+0.1,5);assert.equal(body.pickup_address.line1,'Synthetic pickup');
 if(body.delivery_address.state==='INVALID_TEST_STATE')return Response.json({status:false},{status:422});
 return Response.json({status:true,data:[{amount:5000,currency:'NGN',carrier_name:'Test Carrier',delivery_time:'Test window'},{amount:-1,currency:'NGN',carrier_name:'Invalid'},{amount:20,currency:'USD',carrier_name:'Wrong currency'}]});});
 assert.equal(calls.length,6);assert.equal(report.results.filter(r=>r.status==='quoted').length,4);assert.equal(report.results[4].status,'rejected');assert.equal(report.results[0].rates.length,1);assert.equal(report.bookingEnabled,false);
});
test('missing keys, forbidden routes, authentication failures fail closed',async()=>{let calls=0;const send=async()=>{calls++;return Response.json({status:false},{status:401});};await assert.rejects(()=>sandboxRequest('','/packaging',{},send));await assert.rejects(()=>sandboxRequest('key','/shipments',{},send));assert.equal(calls,0);await assert.rejects(()=>runSandboxQuotes('key',pickup,send),/HTTP 401/);assert.equal(calls,1);assert.throws(()=>inchesToCm(-1));});
test('unavailable, malformed and network failures never become free delivery',async()=>{let n=0;const r=await runSandboxQuotes('key',pickup,async url=>{if(url.endsWith('/packaging'))return Response.json({status:true,data:{packaging_id:'PA-test'}});n++;if(n===1)return Response.json({status:true,data:[]});if(n===2)return new Response('bad');if(n===3)throw new Error('network');return Response.json({status:true,data:{}});});assert.equal(r.results[0].status,'unavailable');assert.ok(r.results.slice(1).every(r=>r.status==='error'));assert.ok(r.results.every(r=>r.rates.length===0));});
