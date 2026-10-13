import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['mobile/src/app-check-cache.ts'],outfile:'work/app-check-cache.mjs',bundle:true,format:'esm',platform:'node'});
const {createAppCheckCache}=await import('../work/app-check-cache.mjs');
test('a token arriving after the UI timeout is retained and simultaneous calls share the native request',async()=>{
 let resolve,calls=0;
 const get=createAppCheckCache(()=>{calls++;return new Promise(r=>{resolve=r;});});
 assert.equal(await get(5),null);
 const waiting=get(1000);
 resolve('late-valid-token');
 assert.equal(await waiting,'late-valid-token');
 assert.equal(await get(5),'late-valid-token');
 assert.equal(calls,1);
});
test('failed verification can retry immediately instead of caching failure for a minute',async()=>{
 let calls=0;
 const get=createAppCheckCache(async()=>{if(++calls===1)throw Error('temporary failure');return 'recovered-token';});
 assert.equal(await get(),null);
 assert.equal(await get(),'recovered-token');
 assert.equal(calls,2);
});
