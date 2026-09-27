import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['lib/admin-draft.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {reconcileAdminDraft}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('customer-care refresh preserves unsaved shipping and collection edits',()=>{
 const previous={shipping:100,collection:'Batch 1'},draft={shipping:200,collection:'Noir Essentials'},incoming={shipping:100,collection:'Batch 1'};
 assert.deepEqual(reconcileAdminDraft(draft,previous,incoming),draft);
});
test('unmodified settings refresh and initial loading use latest server values',()=>{
 const previous={shipping:100},incoming={shipping:150};
 assert.deepEqual(reconcileAdminDraft({...previous},previous,incoming),incoming);
 assert.deepEqual(reconcileAdminDraft(null,null,incoming),incoming);
});
test('successful save retains edits made while the request was in flight',()=>{
 const submitted={title:'Campaign A'},later={title:'Campaign B'},saved={title:'Campaign A'};
 assert.deepEqual(reconcileAdminDraft(later,submitted,saved),later);
 assert.deepEqual(reconcileAdminDraft(submitted,submitted,saved),saved);
});
