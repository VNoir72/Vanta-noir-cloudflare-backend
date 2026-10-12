import test from 'node:test';import assert from 'node:assert/strict';import worker from '../cloudflare-storefront/worker.mjs';
const env={PRODUCT_REDIRECTS:'{}',ASSETS:{fetch:async r=>new URL(r.url).pathname==='/robots.txt'?new Response('User-agent: *\nAllow: /\n'):new Response('<html><head><title>Store</title><meta name="robots" content="noindex,nofollow"></head><body>{"path":"/products/_dynamic"}</body></html>',{headers:{'Content-Type':'text/html'}})},PUBLIC_API:{fetch:async r=>{assert.equal(r.headers.get('Authorization'),null);assert.equal(r.headers.get('Cookie'),null);return Response.json({slug:'cap',title:'Cap',description:'A cap'});}}};
const get=(path,init)=>worker.fetch(new Request(path,init),env);
test('production canonical host, API routing and admin link preserve intended destinations',async()=>{
 assert.equal((await get('https://preview.example/')).status,404);
 assert.equal((await get('http://www.vantanoir.store/account?q=1')).headers.get('location'),'https://vantanoir.store/account?q=1');
 assert.equal((await get('https://vantanoir.store/admin')).headers.get('location'),'https://api.vantanoir.store/admin');
 const api=await get('https://vantanoir.store/api/checkout',{method:'POST',body:'{}'});assert.equal(api.status,307);assert.equal(api.headers.get('location'),'https://api.vantanoir.store/api/checkout');
 assert.match(await (await get('https://vantanoir.store/store-config.js')).text(),/apiBaseUrl:"https:\/\/api.vantanoir.store"/);
});
test('published product indexing and robots restored; preview banner absent',async()=>{
 const r=await get('https://vantanoir.store/products/cap.html');const html=await r.text();assert.equal(r.status,200);assert.equal(r.headers.get('x-robots-tag'),null);assert.doesNotMatch(html,/noindex|Cloudflare preview/);assert.match(html,/rel="canonical" href="https:\/\/vantanoir.store\/products\/cap"/);
 assert.match(await(await get('https://vantanoir.store/robots.txt')).text(),/Allow: \//);
 assert.equal((await get('https://vantanoir.store/storefront-gateway.php')).status,404);
});
