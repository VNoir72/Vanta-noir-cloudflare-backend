import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['lib/admin-read.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {adminRead,hasArray,hasAnalytics}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('admin reads reject expired sessions, server errors and malformed payloads',async t=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 for(const status of [401,403,500]){globalThis.fetch=async()=>new Response('{}',{status});await assert.rejects(adminRead('/fixture',hasArray('rows')));}
 globalThis.fetch=async()=>new Response('<html>login</html>');await assert.rejects(adminRead('/fixture',hasArray('rows')),/unreadable/);
 for(const value of [{},{rows:{}},{rows:null}]){globalThis.fetch=async()=>Response.json(value);await assert.rejects(adminRead('/fixture',hasArray('rows')),/incomplete/);}
 globalThis.fetch=async()=>Response.json({rows:[]});assert.deepEqual(await adminRead('/fixture',hasArray('rows')),{rows:[]});
 globalThis.fetch=async()=>({redirected:true,status:200});await assert.rejects(adminRead('/fixture',hasArray('rows')),/session/);
 assert.equal(hasAnalytics({analytics:{trend:[],categoryMix:[]}}),true);assert.equal(hasAnalytics({analytics:{trend:[]}}),false);
});
test('admin reads time out and respect cancellation, including during body parsing',async t=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 globalThis.fetch=async(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
 await assert.rejects(adminRead('/fixture',hasArray('rows'),{timeoutMs:10}),/timed out/);
 const controller=new AbortController(),pending=adminRead('/fixture',hasArray('rows'),{signal:controller.signal});controller.abort();await assert.rejects(pending,{name:'AbortError'});
 const bodyController=new AbortController();globalThis.fetch=async()=>({ok:true,status:200,json:async()=>{bodyController.abort();return {rows:[]};}});
 await assert.rejects(adminRead('/fixture',hasArray('rows'),{signal:bodyController.signal}),{name:'AbortError'});
});
