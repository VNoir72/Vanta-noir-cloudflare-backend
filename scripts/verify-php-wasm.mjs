// Optional isolated PHP verification without a system-wide PHP installation.
// npm install --prefix /tmp/vanta-php-runtime @php-wasm/cli@3.1.56 --no-audit --no-fund
// node scripts/verify-php-wasm.mjs /tmp/vanta-php-runtime
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2];
if(!root)throw Error('Pass the temporary directory containing the PHP.wasm installation.');
const load=path=>import(pathToFileURL(resolve(root,'node_modules',path)).href);
const {PHP}=await load('@php-wasm/universal/index.js');
const {loadNodeRuntime}=await load('@php-wasm/node/index.js');
// Match the native integration test: only the upstream HTTP response is mocked.
const php=new PHP(await loadNodeRuntime('8.3',{emscriptenOptions:{processId:1,preRun:[m=>{
 m.FS.mkdirTree('/internal/shared');
 m.FS.writeFile('/internal/shared/php.ini','disable_functions=curl_init,curl_setopt_array,curl_close,curl_exec,curl_getinfo\n');
}]}}));
let checks=0;
try{
 const version=(await php.run({code:'<?php echo PHP_VERSION;'})).text;
 php.mkdir('/review');php.mkdir('/review/products');
 php.writeFile('/review/gateway.php',await readFile('portable/storefront-gateway.php','utf8'));
 php.writeFile('/review/products/_dynamic.html','<html><head><title>Vanta Noir</title><meta name="description" content="Generic"><meta name="robots" content="noindex,nofollow"><meta property="og:title" content="Generic"><meta property="og:image" content=""></head><body><h1>Loading product…</h1><script type="application/json">{"path":"/products/_dynamic","products":[]}</script></body></html>');
 php.writeFile('/review/sitemap.xml','<?xml version="1.0"?><urlset><url><loc>https://vantanoir.store/</loc></url></urlset>');
 php.writeFile('/review/router.php',`<?php
 function curl_init($url) { return $url; } function curl_setopt_array($c,$o) {} function curl_close($c) {}
 function curl_exec($c) { $f=json_decode(file_get_contents(__DIR__.'/response.json'),true); return json_encode($f['body']); }
 function curl_getinfo($c,$o) { $f=json_decode(file_get_contents(__DIR__.'/response.json'),true); return $f['status']; }
 require __DIR__.'/gateway.php';`);
 const fixture=(status,body)=>php.writeFile('/review/response.json',JSON.stringify({status,body}));
 const get=async path=>{const response=await php.run({scriptPath:'/review/router.php',relativeUri:path,$_SERVER:{REQUEST_URI:path}});assert.equal(response.errors,'');assert.equal(response.exitCode,0);checks++;return response;};
 fixture(404,{});
 for(const path of ['/products/later-drop','/products/later-drop.html','/products/later-drop/']){
  const r=await get(path);assert.equal(r.httpStatusCode,302);assert.equal(r.headers.location[0],'/#collection');assert.equal(r.text,'');assert.match(r.headers['cache-control'][0],/no-store/);
 }
 const schema={'@context':'https://schema.org','@type':'Product',name:'Product </script><script>alert(1)</script>',offers:{'@type':'Offer',priceCurrency:'NGN',price:30000,availability:'https://schema.org/InStock'}};
 fixture(200,{slug:'later-drop',title:'Back in store <script>alert(1)</script>',description:'New "description"',image:'/images/new.webp',structuredData:schema});
 const published=await get('/products/later-drop');assert.equal(published.httpStatusCode,200);assert.match(published.text,/Back in store &lt;script&gt;/);assert.doesNotMatch(published.text,/<script>alert/);assert.doesNotMatch(published.text,/noindex/);assert.equal(published.headers['x-robots-tag'],undefined);assert.match(published.text,/rel="canonical" href="https:\/\/vantanoir.store\/products\/later-drop"/);
 const markup=published.text.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);assert.ok(markup);assert.deepEqual(JSON.parse(markup[1]),schema);
 const restored=await get('/products/later-drop.html');assert.match(restored.text,/"path":"\/products\/later-drop"/);assert.doesNotMatch(restored.text,/"path":"\/products\/_dynamic"/);
 fixture(503,{error:'offline'});const outage=await get('/products/later-drop');assert.equal(outage.httpStatusCode,503);assert.equal(outage.headers['retry-after'][0],'30');assert.doesNotMatch(outage.text,/later-drop|Back in store|unavailable/);
 fixture(200,{slug:'wrong',title:'Wrong product',description:'Private'});const mismatch=await get('/products/later-drop');assert.equal(mismatch.httpStatusCode,503);assert.doesNotMatch(mismatch.text,/Wrong product|Private/);
 fixture(200,{slugs:['first-drop','bad<script>']});const sitemap=await get('/sitemap.xml');assert.equal(sitemap.httpStatusCode,200);assert.match(sitemap.text,/first-drop/);assert.doesNotMatch(sitemap.text,/later-drop|bad<script>/);
 const invalid=await get('/products/not%20valid');assert.equal(invalid.httpStatusCode,302);
 console.log(JSON.stringify({phpVersion:version,requests:checks,result:'PASS',checks:['unpublished URL redirects','published page restoration','canonical and .html route','HTML escaping','safe Product JSON-LD','upstream outage fails closed','mismatched product fails closed','publication-filtered sitemap','invalid URL redirect'],scope:'Unmodified gateway executed in PHP.wasm; upstream API uses fixtures. Does not test Namecheap Apache configuration or live network.'},null,2));
}finally{php.exit();}
