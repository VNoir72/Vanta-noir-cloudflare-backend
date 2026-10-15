import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['mobile/src/connection-status.ts'],bundle:true,write:false,format:'esm'});
const {connectionStatus}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('reachable store clears even a false OS offline report',()=>{assert.equal(connectionStatus(true,false),'online');});
test('failed probe distinguishes disconnected network from unavailable store',()=>{assert.equal(connectionStatus(false,false),'offline');assert.equal(connectionStatus(false,true),'unavailable');assert.equal(connectionStatus(false,undefined),'unavailable');});
