import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {readdir,readFile,mkdir} from 'node:fs/promises';
import {Miniflare} from './miniflare.mjs';

test('display naming keeps the legacy import fingerprint and cannot resurrect replaced galleries',async()=>{
 await mkdir('work',{recursive:true});
 await build({stdin:{contents:`import products from './data/vd-completion-products.json';import views from './data/catalogue-view-updates.json';import metadata from './data/catalogue-metadata-updates.json';import {productDetailsSchema,productDetails} from './lib/product-details';export const source=[products.map(p=>({...p,details:productDetailsSchema.parse(p.details)})),views,metadata];export {productDetails};`,resolveDir:process.cwd()},outfile:'work/import-fingerprint-fixture.mjs',bundle:true,platform:'node',format:'esm'});
 const {source,productDetails}=await import('../work/import-fingerprint-fixture.mjs');
 assert.equal(productDetails({collection:'Noir / Femme 01 — After Dark'}).collection,'After Dark');assert.equal(productDetails({collection:'Noir / Femme 01 — After Dark'},false).collection,'Noir / Femme 01 — After Dark');
 const expected='vd_full_collection_20260920:release:'+createHash('sha256').update(JSON.stringify(source)).digest('hex');
 await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/import-fingerprint-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const mf=new Miniflare({modules:true,scriptPath:'work/import-fingerprint-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB']});
 try{
 const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 const catalog=async()=>{const r=await mf.dispatchFetch('https://api.example.com/test',{method:'POST',body:JSON.stringify({action:'listCatalog',args:[]})});assert.equal(r.status,200);return r.json();};await catalog();
 assert.ok(await db.prepare('SELECT key FROM store_meta WHERE key=?').bind(expected).first(),'The import must use the original raw-metadata fingerprint');
 const removed=await db.prepare("SELECT id FROM product_images WHERE id LIKE 'vd-full-%' LIMIT 1").first();await db.prepare('DELETE FROM product_images WHERE id=?').bind(removed.id).run();
 await db.prepare("UPDATE products SET details_json=json_set(details_json,'$.collection','After Dark') WHERE json_extract(details_json,'$.collection') LIKE '%Femme%'").run();
 await catalog();assert.equal(await db.prepare('SELECT id FROM product_images WHERE id=?').bind(removed.id).first(),null,'Reading cleaned names cannot reinsert a removed source gallery');
 }finally{await mf.dispose();}
});
