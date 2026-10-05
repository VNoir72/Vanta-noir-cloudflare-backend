import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {Miniflare} from './miniflare.mjs';
test('sandbox job claims once, stores redacted report, and endpoint denies unauthenticated requests',async()=>{
 await build({entryPoints:['tests/terminal-worker.ts'],outfile:'work/terminal-job.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',external:['cloudflare:workers']});let calls=0;
 const mf=new Miniflare({modules:true,scriptPath:'work/terminal-job.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{TERMINAL_AFRICA_TEST_SECRET_KEY:'test-secret-not-for-output',ADMIN_EMAIL:'owner@example.com',AUTH_PROVIDER:'cloudflare-access'},outboundService:async req=>{calls++;assert.equal(new URL(req.url).hostname,'sandbox.terminal.africa');return Response.json({status:true,data:req.url.endsWith('/packaging')?{packaging_id:'PA-test'}:[]});}});
 try{const db=await mf.getD1Database('DB');await db.prepare('CREATE TABLE store_meta(key TEXT PRIMARY KEY,value TEXT)').run();await db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?)').bind('terminal_sandbox_pickup',JSON.stringify({city:'Kaduna',state:'Kaduna',country:'NG',line1:'Synthetic pickup only',first_name:'Test',last_name:'Owner',phone:'+2348000000000',email:'test@example.com',zip:'800242'})).run();
 const get=path=>mf.dispatchFetch('https://test.local'+path);
 assert.equal((await get('/api/admin/terminal')).status,403);assert.equal((await mf.dispatchFetch('https://test.local/api/admin/terminal',{method:'POST'})).status,403);
 const queued=await Promise.all(Array.from({length:8},()=>get('/queue').then(r=>r.json())));assert.equal(queued.filter(r=>r.queued).length,1);
 await Promise.all([get('/run'),get('/run'),get('/run')]);assert.equal(calls,6);const report=await (await get('/status')).json();assert.equal(report.job.status,'completed');assert.equal(report.job.report.results.length,5);assert.ok(!JSON.stringify(report).includes('test-secret'));assert.ok(!JSON.stringify(report).includes('Synthetic pickup'));await get('/run');assert.equal(calls,6);
 }finally{await mf.dispose();}
});
