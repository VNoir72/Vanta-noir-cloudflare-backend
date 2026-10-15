import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const result=await build({entryPoints:['lib/admin-theme-html.ts'],bundle:true,write:false,format:'esm',keepNames:true});
const {standaloneAdminAccentScript}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('standalone shipping uses saved accent and refreshes with readable ink',async()=>{
 const dom=new JSDOM('<html></html>',{url:'https://api.vantanoir.store',runScripts:'outside-only'});const w=dom.window;
 w.localStorage.setItem('vn-admin-accent','#245cff');w.AbortSignal.timeout=()=>undefined;
 w.fetch=async()=>({ok:true,json:async()=>({brandAccent:{admin:'#ffdd00'}})});
 w.eval(standaloneAdminAccentScript);assert.equal(w.document.documentElement.style.getPropertyValue('--admin-accent'),'#245cff');
 await new Promise(r=>setImmediate(r));assert.equal(w.document.documentElement.style.getPropertyValue('--admin-accent'),'#ffdd00');assert.equal(w.document.documentElement.style.getPropertyValue('--admin-on-accent'),'#101510');dom.window.close();
});
