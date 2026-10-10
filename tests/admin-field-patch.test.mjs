import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['lib/admin-field-patch.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {changedFields,applyFieldChanges}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('leaf saves preserve other concurrent changes',()=>{const old={hero:{title:'Old',image:'a'},email:'old'},draft={...old,hero:{...old.hero,title:'New'}},fresh={hero:{...old.hero,image:'b'},email:'new'};assert.deepEqual(changedFields(old,draft),[{path:['hero','title'],before:'Old',value:'New'}]);assert.deepEqual(applyFieldChanges(fresh,changedFields(old,draft),true),{hero:{title:'New',image:'b'},email:'new'});assert.equal(fresh.hero.title,'Old');});
test('same-field conflicts and prototype paths are rejected',()=>{assert.throws(()=>applyFieldChanges({x:2},[{path:['x'],before:1,value:3}],true),/changed/);assert.throws(()=>applyFieldChanges({},[{path:['__proto__','x'],before:null,value:3}]),/Invalid/);});
test('arrays are atomic so concurrent playlist reorder is never lost',()=>{const old={playlist:['a','b']},changes=changedFields(old,{playlist:['b','a']});assert.throws(()=>applyFieldChanges({playlist:['a','c']},changes,true),/changed/);assert.deepEqual(applyFieldChanges(old,changes,true),{playlist:['b','a']});});
