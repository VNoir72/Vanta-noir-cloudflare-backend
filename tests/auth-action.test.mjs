import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {authActionHtml,authActionScript} from '../cloudflare-storefront/auth-action.mjs';
import worker from '../cloudflare-storefront/worker.mjs';
function page(mode,fetch){const dom=new JSDOM(authActionHtml,{url:'https://vantanoir.store/auth/action#mode='+mode+'&oobCode=fixture-only&continueUrl=https://attacker.invalid',runScripts:'outside-only'});dom.window.fetch=fetch;dom.window.AbortSignal=AbortSignal;dom.window.eval(authActionScript);return dom;}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
test('verification waits for confirmation; strips code and reports success only after provider accepts',async()=>{
 let calls=0;const dom=page('verifyEmail',async(url,init)=>{calls++;assert.match(url,/^https:\/\/identitytoolkit.googleapis.com\/v1\/accounts:update\?/);assert.deepEqual(JSON.parse(init.body),{oobCode:'fixture-only'});return Response.json({emailVerified:true});});const d=dom.window.document;
 assert.equal(calls,0);assert.equal(dom.window.location.hash,'');await d.getElementById('verify').onclick();assert.equal(calls,1);assert.equal(d.getElementById('title').textContent,'You’re verified.');assert.equal(d.getElementById('continue').getAttribute('href'),'/account');dom.window.close();
});
test('invalid verification never shows success and supports a retry',async()=>{
 const dom=page('verifyEmail',async()=>Response.json({error:{message:'INVALID_OOB_CODE'}},{status:400}));await dom.window.document.getElementById('verify').onclick();assert.match(dom.window.document.getElementById('error').textContent,/expired or has already been used/);assert.notEqual(dom.window.document.getElementById('title').textContent,'You’re verified.');assert.equal(dom.window.document.getElementById('verify').disabled,false);dom.window.close();
});
test('reset checks the code first, rejects mismatch, then submits password and clears fields',async()=>{
 const calls=[];const dom=page('resetPassword',async(url,init)=>{calls.push(JSON.parse(init.body));return Response.json({requestType:'PASSWORD_RESET'});});await tick();const d=dom.window.document;assert.equal(d.getElementById('reset').hidden,false);d.getElementById('password').value='Fixture-only-987!';d.getElementById('confirm').value='different';await d.getElementById('reset').onsubmit({preventDefault(){}});assert.equal(calls.length,1);d.getElementById('confirm').value='Fixture-only-987!';await d.getElementById('reset').onsubmit({preventDefault(){}});assert.equal(calls.length,2);assert.equal(calls[1].newPassword,'Fixture-only-987!');assert.equal(d.getElementById('password').value,'');assert.equal(d.getElementById('reset').hidden,true);dom.window.close();
});
test('branded action route is private, uncacheable, and contains no tracking',async()=>{
 const r=await worker.fetch(new Request('https://vantanoir.store/auth/action'),{});assert.equal(r.status,200);assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.equal(r.headers.get('cache-control'),'no-store');assert.match(r.headers.get('x-robots-tag'),/noindex/);assert.match(await r.text(),/VANTA NOIR/);
 const js=await worker.fetch(new Request('https://vantanoir.store/auth/action.js'),{});assert.equal(js.status,200);assert.match(js.headers.get('content-type'),/javascript/);
});

for (const mode of ['verifyEmail','resetPassword']) {
 test(mode+' sends only the site origin to Google after removing action parameters',async()=>{
  let dom;const calls=[];
  dom=page(mode,async(url,init)=>{calls.push({url,init});return Response.json({requestType:'PASSWORD_RESET'});});
  if(mode==='verifyEmail')await dom.window.document.getElementById('verify').onclick();else await tick();
  assert.equal(calls.length,1);
  assert.equal(dom.window.location.href,'https://vantanoir.store/auth/action');
  assert.equal(calls[0].init.referrer,'https://vantanoir.store/');
  assert.equal(calls[0].init.referrerPolicy,'strict-origin');
  assert.equal(calls[0].init.credentials,'omit');
  assert.equal(new URL(calls[0].url).searchParams.has('oobCode'),false);
  assert.equal(dom.window.document.querySelector('meta[name="referrer"]').content,'no-referrer');
  dom.window.close();
 });
}
test('a forbidden provider request reports a service problem rather than a connection problem',async()=>{
 const dom=page('verifyEmail',async()=>Response.json({error:{message:'Requests from referer <empty> are blocked.'}},{status:403}));
 await dom.window.document.getElementById('verify').onclick();
 assert.match(dom.window.document.getElementById('error').textContent,/temporarily unavailable/);
 assert.doesNotMatch(dom.window.document.getElementById('error').textContent,/Check your connection/);
 assert.equal(dom.window.document.getElementById('verify').disabled,false);dom.window.close();
});
test('account page uses the current storefront accent without forwarding customer credentials',async()=>{
 const env={PUBLIC_API:{fetch:async request=>{assert.equal(request.url,'https://api.vantanoir.store/api/store-settings');assert.equal(request.headers.get('cookie'),null);assert.equal(request.headers.get('authorization'),null);return Response.json({brandAccent:{storefront:'#930022'}});}}};
 const r=await worker.fetch(new Request('https://vantanoir.store/auth/action',{headers:{cookie:'private=fixture',authorization:'Bearer fixture'}}),env);
 const html=await r.text();assert.match(html,/--accent:#930022;--on-accent:#ffffff/);assert.match(html,/class="envelope"/);assert.match(html,/welcome-burgundy.jpg/);
});
test('invalid accent and unavailable theme service cannot break account access',async()=>{
 for(const fetch of [async()=>Response.json({brandAccent:{storefront:'red;display:none'}}),async()=>{throw Error('offline');}]){
  const r=await worker.fetch(new Request('https://vantanoir.store/auth/action'),{PUBLIC_API:{fetch}});assert.equal(r.status,200);const html=await r.text();assert.match(html,/--accent:#c8ff65/);assert.doesNotMatch(html,/red;display:none/);
 }
});
