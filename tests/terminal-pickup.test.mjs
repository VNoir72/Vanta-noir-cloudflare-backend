import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {Miniflare} from './miniflare.mjs';
test('private pickup profile saves and reloads, normalizes phones, rejects invalid and stale writes, preserves sandbox fixture',async()=>{
 await build({entryPoints:['tests/terminal-pickup-worker.ts'],outfile:'work/terminal-pickup.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',external:['cloudflare:workers']});const mf=new Miniflare({modules:true,scriptPath:'work/terminal-pickup.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{ADMIN_EMAIL:'owner@example.com',AUTH_PROVIDER:'cloudflare-access'},outboundService:()=>{throw Error('Pickup save must not call a courier');}});
 try{const db=await mf.getD1Database('DB');await db.prepare('CREATE TABLE store_meta(key TEXT PRIMARY KEY,value TEXT)').run();await db.prepare("INSERT INTO store_meta VALUES('terminal_sandbox_pickup','test address only')").run();const details={line1:'  Fictional pickup address  ',line2:'',city:'Kaduna',state:'Kaduna',country:'NG',first_name:'Test',last_name:'Owner',phone:'080 1234 5678',email:'owner@example.com',zip:'800001'};
 const save=async(d,revision)=>{const r=await mf.dispatchFetch('https://test.local/save',{method:'POST',body:JSON.stringify({details:d,revision})});return {status:r.status,data:await r.json()};};
 for(const method of ['GET','PUT'])assert.equal((await mf.dispatchFetch('https://test.local/api/admin/terminal-pickup',{method})).status,403);
 assert.equal(await(await mf.dispatchFetch('https://test.local/read')).json(),null);
 for(const bad of [{phone:'123'},{zip:'123'},{state:'Unknown'},{email:'invalid'},{line1:''},{first_name:'\u0000a'}])assert.equal((await save({...details,...bad},null)).status,400);
 const first=await save(details,null);assert.equal(first.status,200);assert.equal(first.data.details.phone,'+2348012345678');assert.equal(first.data.details.line1,'Fictional pickup address');assert.deepEqual(await(await mf.dispatchFetch('https://test.local/read')).json(),first.data);
 assert.equal((await save(details,null)).status,400);
 const writes=await Promise.all([save({...details,city:'Ikeja'},first.data.revision),save({...details,city:'Wuse'},first.data.revision)]);assert.equal(writes.filter(r=>r.status===200).length,1);assert.equal((await save(details,first.data.revision)).status,400);
 assert.equal((await db.prepare("SELECT value FROM store_meta WHERE key='terminal_sandbox_pickup'").first()).value,'test address only');
 }finally{await mf.dispose();}
});
