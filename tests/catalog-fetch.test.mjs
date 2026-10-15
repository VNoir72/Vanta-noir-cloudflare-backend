import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchCatalogResponse} from '../lib/catalog-fetch.ts';
test('catalogue retries transient failures once without caching current inventory',async()=>{
 for(const first of ['network',503]){let calls=0;const response=await fetchCatalogResponse('https://example.com/api/catalog',new AbortController().signal,async(_url,options)=>{assert.equal(options.cache,'no-store');calls++;if(calls===1){if(first==='network')throw Error('offline');return new Response('',{status:first});}return Response.json({products:[]});});assert.equal(calls,2);assert.equal(response.status,200);}
});
test('catalogue never retries rejected access or rate limits',async()=>{
 for(const status of [401,403,429]){let calls=0;const r=await fetchCatalogResponse('https://example.com/api/catalog',new AbortController().signal,async()=>{calls++;return new Response('',{status});});assert.equal(r.status,status);assert.equal(calls,1);}
});
test('catalogue retry is bounded and cancellation stops the request',async()=>{
 let calls=0;await assert.rejects(fetchCatalogResponse('https://example.com/api/catalog',new AbortController().signal,async()=>{calls++;throw Error('offline');}));assert.equal(calls,2);
 const controller=new AbortController();controller.abort();calls=0;await assert.rejects(fetchCatalogResponse('https://example.com/api/catalog',controller.signal,async()=>{calls++;throw Error('aborted');}));assert.equal(calls,1);
});
