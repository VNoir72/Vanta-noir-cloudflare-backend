import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/storefront.mjs';

test('release cutouts use storefront assets while existing studio images retain API delivery', async () => {
  const calls=[];
  const env={
    ASSETS:{fetch:async r=>{calls.push(['assets',new URL(r.url).pathname]);return new Response('cutout',{headers:{'Content-Type':'image/webp'}});}},
    PUBLIC_API:{fetch:async r=>{calls.push(['api',new URL(r.url).pathname]);return new Response('studio',{headers:{'Content-Type':'image/webp'}});}}
  };
  const path='/images/floating/80f0ce01daa8745e5a540ab9.webp';
  const r=await worker.fetch(new Request('https://vantanoir.store'+path),env);
  assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'image/webp');assert.equal(await r.text(),'cutout');
  await worker.fetch(new Request('https://vantanoir.store/images/studio/example.webp'),env);
  assert.deepEqual(calls,[['assets',path],['api','/images/studio/example.webp']]);
});
