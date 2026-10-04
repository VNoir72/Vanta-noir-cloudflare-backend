import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';

test('Namecheap gateway hides old URLs, restores published URLs and fails closed',{skip:spawnSync('php',['-v']).error?'PHP runtime is not installed':false},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'vn-visibility-'));
 let server;
 try {
  await mkdir(join(dir,'products'));
  await copyFile('portable/storefront-gateway.php',join(dir,'gateway.php'));
  await writeFile(join(dir,'products/_dynamic.html'),'<html><head><title>Vanta Noir</title><meta name="description" content="Generic"><meta name="robots" content="noindex,nofollow"><meta property="og:title" content="Generic"><meta property="og:image" content=""></head><body><h1>Loading product…</h1><script type="application/json">{"path":"/products/_dynamic","products":[]}</script></body></html>');
  await writeFile(join(dir,'sitemap.xml'),'<?xml version="1.0"?><urlset><url><loc>https://vantanoir.store/</loc></url></urlset>');
  // -n disables curl: fixture functions simulate only the upstream response.
  await writeFile(join(dir,'router.php'),`<?php
  foreach (['CURLOPT_RETURNTRANSFER','CURLOPT_FOLLOWLOCATION','CURLOPT_CONNECTTIMEOUT','CURLOPT_TIMEOUT','CURLINFO_HTTP_CODE'] as $i => $constant) define($constant,$i);
  function curl_init($url) { return $url; } function curl_setopt_array($c,$o) {} function curl_close($c) {}
  function curl_exec($c) { $f=json_decode(file_get_contents(__DIR__.'/response.json'),true); return json_encode($f['body']); }
  function curl_getinfo($c,$o) { $f=json_decode(file_get_contents(__DIR__.'/response.json'),true); return $f['status']; }
  require __DIR__.'/gateway.php';`);
  const net=await import('node:net');const reserve=net.createServer();reserve.listen(0,'127.0.0.1');await once(reserve,'listening');const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
  server=spawn('php',['-n','-S',`127.0.0.1:${port}`,join(dir,'router.php')],{cwd:dir,stdio:['ignore','ignore','pipe']});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.stderr.on('data',chunk=>{if(String(chunk).includes('started'))resolve()});server.once('exit',code=>reject(Error(`PHP exited ${code}`)))});
  const fixture=async(status,body)=>writeFile(join(dir,'response.json'),JSON.stringify({status,body}));
  const get=path=>fetch(`http://127.0.0.1:${port}${path}`,{redirect:'manual'});
  await fixture(404,{});
  for(const path of ['/products/later-drop','/products/later-drop.html','/products/later-drop/']){
   const response=await get(path);assert.equal(response.status,302);assert.equal(response.headers.get('location'),'/#collection');assert.equal(await response.text(),'');assert.match(response.headers.get('cache-control'),/no-store/);
  }
  await fixture(200,{slug:'later-drop',title:'Back in store <script>alert(1)</script>',description:'New "description"',image:'/images/new.webp'});
  const published=await get('/products/later-drop');const html=await published.text();assert.equal(published.status,200);assert.match(html,/Back in store &lt;script&gt;/);assert.doesNotMatch(html,/<script>alert/);assert.doesNotMatch(html,/noindex/);assert.match(html,/rel="canonical" href="https:\/\/vantanoir.store\/products\/later-drop"/);
  const restoredHtml = await (await get('/products/later-drop.html')).text();
  assert.match(restoredHtml, /"path":"\/products\/later-drop"/);
  assert.doesNotMatch(restoredHtml, /"path":"\/products\/_dynamic"/);
  await fixture(503,{error:'offline'});const outage=await get('/products/later-drop');assert.equal(outage.status,503);assert.doesNotMatch(await outage.text(),/later-drop|Back in store|unavailable/);
  await fixture(200,{slugs:['first-drop']});const map=await get('/sitemap.xml');const xml=await map.text();assert.match(xml,/first-drop/);assert.doesNotMatch(xml,/later-drop/);
 } finally { if(server?.pid&&server.exitCode===null){const exited=once(server,'exit');server.kill();await exited} await rm(dir,{recursive:true,force:true}); }
});
