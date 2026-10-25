import test from 'node:test';import assert from 'node:assert/strict';
import worker from '../cloudflare-storefront/worker.mjs';
const html='<html><head><title>Vanta Noir</title></head><body><div id="root"></div></body></html>';
test('saved accent and escaped public snapshot are present before first paint without forwarding credentials',async()=>{
 const env={ASSETS:{fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html'}})},PUBLIC_API:{fetch:async r=>{
  assert.equal(new URL(r.url).pathname,'/api/store-settings');assert.equal(r.headers.get('Cookie'),null);assert.equal(r.headers.get('Authorization'),null);
  return Response.json({brandAccent:{storefront:'#5533aa'},returnPolicy:'</script><script>bad()</script>'});
 }}};
 const r=await worker.fetch(new Request('https://vantanoir.store/',{headers:{Cookie:'private',Authorization:'private'}}),env);const body=await r.text();
 assert.equal(r.status,200);assert.ok(body.indexOf('--vn-brand-lime:#5533aa')<body.indexOf('</head>'));
 assert.match(body,/id="vn-public-settings"/);assert.doesNotMatch(body,/<script>bad/);assert.match(body,/\\u003c\/script>/);
});
test('public settings outage leaves the page available; invalid accent cannot inject CSS',async()=>{
 for(const response of [new Response('Unavailable',{status:503}),Response.json({brandAccent:{storefront:'red;}body{display:none'}})]){
  const env={ASSETS:{fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html'}})},PUBLIC_API:{fetch:async()=>response}};
  const r=await worker.fetch(new Request('https://vantanoir.store/'),env);assert.equal(r.status,200);assert.doesNotMatch(await r.text(),/<style id="vn-saved-accent">/);
 }
});
test('Paystack script, connection and frame permissions remain limited to checkout',async()=>{
 const env={ASSETS:{fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html'}})},PUBLIC_API:{fetch:async()=>new Response('',{status:503})}};
 for(const path of ['/','/checkout']){const r=await worker.fetch(new Request('https://vantanoir.store'+path),env);const csp=r.headers.get('Content-Security-Policy');assert.equal(csp.includes('https://js.paystack.co'),path==='/checkout');assert.equal(csp.includes('https://api.paystack.co'),path==='/checkout');}
});
