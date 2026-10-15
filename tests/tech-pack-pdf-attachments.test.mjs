import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync,mkdirSync} from 'node:fs';
const manifest=JSON.parse(readFileSync('data/tech-pack-pdf-r06.json','utf8'));

test('PDF attachments have unique files and exact garment/colourway identities',()=>{
 assert.equal(Object.keys(manifest).length,735);
 const files=new Set();let count=0;
 for(const [id,rows] of Object.entries(manifest)){
  assert.equal(new Set(rows.map(r=>r.color)).size,rows.length);
  for(const r of rows){assert(r.file.startsWith(id+'--'));assert.match(r.file,/^[a-z0-9-]+--[a-f0-9]{8}\.pdf$/);assert.match(r.sha256,/^[a-f0-9]{64}$/);assert(!files.has(r.file));files.add(r.file);count++;}
 }
 assert.equal(count,1001);
});

test('admin PDF route rejects unauthorized, wrong garment/colourway, and missing/corrupt objects',async()=>{
 mkdirSync('work',{recursive:true});
 await build({entryPoints:['app/api/admin/tech-packs/route.ts'],outfile:'work/pdf-route-test.mjs',bundle:true,platform:'node',format:'esm',plugins:[{name:'fixtures',setup(b){
  b.onResolve({filter:/^@\/lib\/(admin-auth|runtime-env)$/},args=>({path:args.path,namespace:'fixtures'}));
  b.onLoad({filter:/.*/,namespace:'fixtures'},args=>({contents:args.path.endsWith('admin-auth')?`export async function adminAuthStateFromRequest(r){const role=r.headers.get('x-test-role');return role==='owner'?{ok:true}:{ok:false,status:role?403:401,error:'Denied'};}`:`export function getDbBinding(){return globalThis.__pdfTest.db}export function runtimeEnv(){return {BUCKET:globalThis.__pdfTest.bucket}}`,loader:'js'}));
 }}]});
 const {GET}=await import('../work/pdf-route-test.mjs');const id=Object.keys(manifest).find(k=>manifest[k].length>1),pdf=manifest[id][0];let reads=0;let object={body:'%PDF-test',size:pdf.bytes,customMetadata:{sha256:pdf.sha256}};
 globalThis.__pdfTest={db:{prepare(){return {bind(value){return {async first(){return value===id?{id,name:'Test <garment>'}:null}}}}}},bucket:{async get(key){reads++;assert.equal(key,'tech-packs/r06-20261015/'+pdf.file);return object;}}};
 const request=(params,role='owner')=>GET(new Request('https://test/api/admin/tech-packs?'+new URLSearchParams({id,...params}),{headers:role?{'x-test-role':role}:{}}));
 assert.equal((await request({format:'pdf'},'')).status,401);assert.equal((await request({format:'pdf'},'customer')).status,403);assert.equal(reads,0);
 assert.equal((await request({format:'pdf',color:'not this colour'})).status,404);assert.equal((await request({format:'pdf'})).status,404);assert.equal((await request({id:'foreign',format:'pdf',color:pdf.color})).status,404);assert.equal(reads,0);
 const files=await request({format:'files'});assert.equal(files.status,200);const html=await files.text();assert(html.includes('Test &lt;garment&gt;'));assert(html.includes('format=pdf'));assert(html.includes('Sampling drafts'));
 const good=await request({format:'pdf',color:pdf.color});assert.equal(good.status,200);assert.equal(good.headers.get('content-type'),'application/pdf');assert.equal(good.headers.get('cache-control'),'private, no-store');assert.equal(await good.text(),'%PDF-test');
 object=null;assert.equal((await request({format:'pdf',color:pdf.color})).status,503);
 object={body:'bad',size:pdf.bytes,customMetadata:{sha256:'wrong'}};assert.equal((await request({format:'pdf',color:pdf.color})).status,503);
 delete globalThis.__pdfTest;
});
