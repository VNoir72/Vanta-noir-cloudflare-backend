import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
test('incomplete app preview response cannot blank the storefront',async()=>{
 const result=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {AppAccessPreview} from './components/app-access-preview';createRoot(document.getElementById('root')).render(<><h1>Store is usable</h1><AppAccessPreview/></>);`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"production"'}});
 for(const data of [{},null,{drops:null},{drops:[]}]){
  const errors=[],v=new VirtualConsole();v.on('jsdomError',e=>errors.push(e));
  const dom=new JSDOM('<div id="root"></div>',{url:'https://example.invalid',runScripts:'dangerously',virtualConsole:v});
  try{dom.window.fetch=async()=>({ok:true,json:async()=>data});dom.window.eval(result.outputFiles[0].text);await new Promise(r=>setTimeout(r,40));assert.match(dom.window.document.body.textContent,/Store is usable/);assert.equal(errors.length,0);}finally{dom.window.close();}
 }
});
