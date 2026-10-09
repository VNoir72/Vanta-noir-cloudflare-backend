import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {Miniflare} from './miniflare.mjs';
test('comparison job rejects guests, claims once, uses only test keys and never touches orders',async()=>{
 await build({entryPoints:['tests/shipping-comparison-worker.ts'],outfile:'work/shipping-comparison.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',external:['cloudflare:workers']});
 let calls=0;
 const mf=new Miniflare({modules:true,scriptPath:'work/shipping-comparison.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{AUTH_PROVIDER:'cloudflare-access',ADMIN_EMAIL:'owner@example.com',TERMINAL_AFRICA_TEST_SECRET_KEY:'terminal-test',TERMINAL_AFRICA_LIVE_SECRET_KEY:'NEVER-USE-LIVE',SHIPBUBBLE_TEST_API_KEY:'sb_sandbox_fixture',SHIPBUBBLE_API_KEY:'NEVER-USE-LIVE'},outboundService:async r=>{
  calls++;const u=new URL(r.url),auth=r.headers.get('Authorization');assert.ok(!auth.includes('LIVE'));
  if(u.hostname==='sandbox.terminal.africa'){assert.equal(auth,'Bearer terminal-test');assert.ok(['/v1/packaging','/v1/rates/shipment/quotes'].includes(u.pathname));return Response.json({status:true,data:u.pathname.endsWith('/packaging')?{packaging_id:'PK-1'}:[{rate_id:'RT-1',carrier_name:'Courier',currency:'NGN',amount:2500}]});}
  assert.equal(u.hostname,'api.shipbubble.com');assert.equal(auth,'Bearer sb_sandbox_fixture');
  if(u.pathname.endsWith('/address/validate'))return Response.json({status:'success',data:{address_code:123}});
  if(u.pathname.endsWith('/labels/categories'))return Response.json({status:'success',data:[{category:'Fashion wears',category_id:987}]});
  assert.ok(u.pathname.endsWith('/fetch_rates'));return Response.json({status:'success',data:{request_token:'token1',couriers:[{service_code:'courier',courier_name:'Courier',service_type:'pickup',currency:'NGN',total:2000}]}});
 }});
 try{
  const db=await mf.getD1Database('DB');await db.prepare('CREATE TABLE store_meta(key TEXT PRIMARY KEY,value TEXT)').run();
  const pickup={first_name:'Sandbox',last_name:'Tester',email:'test@example.com',phone:'+2348000000000',line1:'Test address',city:'Kaduna',state:'Kaduna',country:'NG',zip:'800242'};
  await db.prepare('INSERT INTO store_meta VALUES(?,?)').bind('terminal_sandbox_pickup',JSON.stringify(pickup)).run();
  for(const method of ['GET','POST'])assert.equal((await mf.dispatchFetch('https://test.local/api/admin/shipping-comparison',{method})).status,403);
  assert.equal(calls,0);
  const result=await(await mf.dispatchFetch('https://test.local/run')).json();assert.equal(result.job.status,'completed');assert.equal(result.job.allProvidersReturnedRates,true);assert.equal(result.job.results.length,4);assert.equal(calls,24);assert.equal(result.checkoutEnabled,false);assert.equal(result.bookingEnabled,false);
  assert.ok(!JSON.stringify(result).includes('NEVER-USE-LIVE'));assert.ok(!JSON.stringify(result).includes('test@example.com'));
  const tables=await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();assert.ok(!tables.results.some(t=>t.name==='orders'));
 }finally{await mf.dispose();}
});
