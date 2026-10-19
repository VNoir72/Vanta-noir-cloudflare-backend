import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const compiled=await build({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import {CustomerAccountAccess} from './app/admin/customer-account-access';createRoot(document.getElementById('root')).render(<CustomerAccountAccess email='buyer@example.com'/>);",loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"test"'}});
test('account controls require an explicit reason and confirmation, preserve failure state, and reload stale status',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://test/',runScripts:'dangerously',pretendToBeVisual:true}),w=dom.window;
 let current={email:'buyer@example.com',registered:true,status:'active',version:0,updatedAt:null,reason:'',updatedBy:''},posts=[],fail=false;
 w.fetch=async(url,options)=>{if(options?.method==='POST'){const body=JSON.parse(options.body);posts.push(body);if(fail)return Response.json({error:'Account access changed. Reload its status before trying again.'},{status:409});current={...current,status:body.action==='suspend'?'suspended':'active',version:current.version+1,reason:body.reason,updatedAt:Date.now(),updatedBy:'owner@example.com'};}return Response.json(current);};
 const wait=async(fn)=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('UI condition timed out');};
 const button=text=>[...w.document.querySelectorAll('button')].find(b=>b.textContent===text);
 const type=async value=>{const el=w.document.querySelector('textarea');Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype,'value').set.call(el,value);el.dispatchEvent(new w.Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,20));};
 try{
  w.eval(compiled.outputFiles[0].text);await wait(()=>button('Suspend account'));
  button('Suspend account').click();await wait(()=>button('Confirm suspension'));assert.equal(posts.length,0);assert.equal(button('Confirm suspension').disabled,true);
  await type('Suspicious login activity');button('Cancel').click();await wait(()=>button('Suspend account'));assert.equal(posts.length,0);
  button('Suspend account').click();await wait(()=>w.document.querySelector('textarea'));await type('Suspicious login activity');button('Confirm suspension').click();await wait(()=>button('Restore account'));
  assert.deepEqual(posts[0],{email:'buyer@example.com',version:0,action:'suspend',reason:'Suspicious login activity'});assert.match(w.document.body.textContent,/Existing store sessions were revoked/);
  button('Restore account').click();await wait(()=>w.document.querySelector('textarea'));await type('Investigation complete');fail=true;button('Confirm restoration').click();await wait(()=>w.document.querySelector('[role=alert]'));
  assert.match(w.document.body.textContent,/Reload its status/);assert.ok(button('Confirm restoration'));assert.equal(w.document.querySelector('textarea').value,'Investigation complete');assert.match(w.document.body.textContent,/Suspended/);
  button('Reload access status').click();await wait(()=>button('Restore account'));assert.equal(w.document.querySelector('textarea'),null);
  fail=false;button('Restore account').click();await wait(()=>w.document.querySelector('textarea'));await type('Investigation complete');button('Confirm restoration').click();await wait(()=>button('Suspend account'));assert.match(w.document.body.textContent,/customer must sign in again/);
 }finally{w.close();}
});
