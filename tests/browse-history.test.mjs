import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('work',{recursive:true});
await build({entryPoints:['lib/browse-history.ts'],outfile:'work/browse-history.mjs',bundle:true,platform:'node',format:'esm'});
const {replaceBrowseUrl}=await import('../work/browse-history.mjs');
test('filter URL updates preserve router state and do not navigate',()=>{
 const state={scroll:100},calls=[];
 const history={state,replaceState(...args){calls.push(args);}};
 replaceBrowseUrl(history,'/','/?min=1000');
 assert.deepEqual(calls,[[state,'','/?min=1000']]);
 replaceBrowseUrl(history,'/?min=1000','/?min=1000');assert.equal(calls.length,1);
});
test('browser history throttling cannot crash filtering',()=>{
 assert.doesNotThrow(()=>replaceBrowseUrl({state:null,replaceState(){throw new DOMException('throttled','SecurityError');}},'/','/?min=2000'));
});
