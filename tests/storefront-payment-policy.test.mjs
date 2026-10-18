import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare-storefront/worker.mjs';
const env = {
 RELEASE_SHA: 'policy-test',
 ASSETS: {fetch: async () => new Response('<!doctype html><title>Existing storefront</title>', {headers:{'Content-Type':'text/html'}})},
 PUBLIC_API: {fetch: async () => Response.json({brandAccent:{storefront:'#00ff66'}})},
};
async function response(path) { return worker.fetch(new Request('https://vantanoir.store'+path),env); }
function directive(response,name) {
 const policy=response.headers.get('Content-Security-Policy');
 return policy.split(';').map(s=>s.trim().split(/\s+/)).find(parts=>parts[0]===name).slice(1);
}
test('checkout allows the Paystack script, frame and requests',async()=>{
 for(const path of ['/checkout','/checkout/complete']){
  const r=await response(path);
  assert.equal(r.status,200);
  assert.ok(directive(r,'script-src').includes('https://js.paystack.co'));
  assert.ok(directive(r,'frame-src').includes('https://checkout.paystack.com'));
  assert.ok(directive(r,'connect-src').includes('https://api.paystack.co'));
 }
});
test('other pages keep their existing script and frame restrictions',async()=>{
 for(const path of ['/','/account','/contact','/auth/action']){
  const r=await response(path);
  assert.ok(!directive(r,'script-src').includes('https://js.paystack.co'));
  assert.ok(!directive(r,'frame-src').includes('https://checkout.paystack.com'));
 }
});
test('checkout does not allow arbitrary scripts or inline code',async()=>{
 const r=await response('/checkout');
 for(const name of ['script-src','frame-src','connect-src']){
  assert.ok(!directive(r,name).includes('*'));
  assert.ok(!directive(r,name).includes('https:'));
 }
 assert.ok(!directive(r,'script-src').includes("'unsafe-inline'"));
 assert.equal(r.headers.get('X-Frame-Options'),'DENY');
});
test('existing storefront assets, redirects and health remain available',async()=>{
 assert.match(await (await response('/')).text(),/Existing storefront/);
 const admin=await response('/admin');
 assert.equal(admin.status,302);
 assert.equal(admin.headers.get('Location'),'https://api.vantanoir.store/admin');
 assert.deepEqual(await (await response('/health')).json(),{ok:true,mode:'production-storefront',source:'policy-test'});
});
test('deployed account theme support is retained',async()=>{
 const r=await response('/auth/action');
 assert.equal(r.status,200);
 assert.match(await r.text(),/#00ff66/);
 assert.equal(r.headers.get('Referrer-Policy'),'no-referrer');
});
