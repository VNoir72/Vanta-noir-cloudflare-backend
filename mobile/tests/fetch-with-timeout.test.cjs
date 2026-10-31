const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ts=require('typescript');
const {AbortController,AbortSignal}=require('abort-controller/dist/abort-controller');
function fixture(fetch){
 const exports={};let pending=new Set();
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/fetch-with-timeout.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,AbortController,fetch,setTimeout:(fn,ms)=>{const id=setTimeout(fn,ms);pending.add(id);return id;},clearTimeout:id=>{pending.delete(id);clearTimeout(id);}});
 return {...exports,pending};
}
test('requests work with the actual React Native AbortSignal lacking timeout',async()=>{
 assert.equal(typeof AbortSignal.timeout,'undefined');
 let called=false;const f=fixture(async(url,options)=>{called=true;assert.equal(url,'https://example.test/auth-methods');assert.equal(options.signal.aborted,false);return {ok:true};});
 assert.equal((await f.fetchWithTimeout('https://example.test/auth-methods')).ok,true);assert.equal(called,true);assert.equal(f.pending.size,0);
});
test('stalled native request aborts and clears its timer',async()=>{
 const f=fixture((url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')))));
 await assert.rejects(f.fetchWithTimeout('https://example.test',{},5),/aborted/);assert.equal(f.pending.size,0);
});
test('network failures clear timers and preserve errors',async()=>{
 const error=Error('network unavailable');const f=fixture(async()=>{throw error;});
 await assert.rejects(f.fetchWithTimeout('https://example.test'),e=>e===error);assert.equal(f.pending.size,0);
});
test('JSON deadline includes a stalled body after successful headers',async()=>{
 let signal;
 const f=fixture(async(url,options)=>{signal=options.signal;return {ok:true,json:()=>new Promise(()=>{})};});
 await assert.rejects(f.fetchJsonWithTimeout('https://example.test/catalog',{},5),/timed out/);
 assert.equal(signal.aborted,true);assert.equal(f.pending.size,0);
});
test('JSON deadline settles even if the native transport ignores abort',async()=>{
 const f=fixture(()=>new Promise(()=>{}));
 await assert.rejects(f.fetchJsonWithTimeout('https://example.test/catalog',{},5),/timed out/);
 assert.equal(f.pending.size,0);
});
test('JSON success preserves response status and parsed error bodies',async()=>{
 const response={ok:false,status:503,json:async()=>({error:'Try again'})};
 const f=fixture(async()=>response);
 const result=await f.fetchJsonWithTimeout('https://example.test/catalog');
 assert.equal(result.response,response);assert.equal(result.data.error,'Try again');assert.equal(f.pending.size,0);
});
