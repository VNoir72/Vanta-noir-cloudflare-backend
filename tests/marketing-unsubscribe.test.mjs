import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const output=await build({entryPoints:['lib/marketing-unsubscribe.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {marketingUnsubscribeHeaders:headers}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const token='01234567-89ab-4cde-8abc-0123456789ab'.repeat(2);
test('marketing messages expose one-click POST headers; transactional and confirmation mail do not',()=>{
 for(const key of ['subscription:s:restock:'+token,'subscription:s:release:1:p:'+token,'automation:checkout:o:s:'+token,'automation:aftercare:o:s:'+token]){const h=headers(key);assert.equal(h['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click');assert.equal(new URL(h['List-Unsubscribe'].slice(1,-1)).searchParams.get('one_click'),token);}
 for(const key of ['order:o:payment','subscription:s:confirm:'+token,'customer:verify:'+token,'automation:delivery:customer:s:shipped','subscription:s:release:bad\r\nHeader: injected'])assert.equal(headers(key),undefined);
});
