import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
const compiled=await build({entryPoints:['lib/storefront-visibility.ts','lib/cart.ts'],bundle:true,write:false,platform:'node',format:'esm',outdir:'unused'});
const modules=await Promise.all(compiled.outputFiles.map(file=>import('data:text/javascript;base64,'+Buffer.from(file.text).toString('base64'))));
const {storefrontVisibility}=modules.find(m=>m.storefrontVisibility);
const {reconcileCart}=modules.find(m=>m.reconcileCart);
const sqlite=new DatabaseSync(':memory:');
sqlite.exec("CREATE TABLE products(slug TEXT PRIMARY KEY,name TEXT,description TEXT,image_url TEXT,details_json TEXT,active INTEGER,status TEXT); INSERT INTO products VALUES('first-drop','First Drop','New garment','/images/first.webp','{}',1,'published'),('later-drop','Later Drop','Private garment','/images/later.webp','{}',0,'draft');");
sqlite.exec("ALTER TABLE products ADD COLUMN id TEXT; ALTER TABLE products ADD COLUMN category TEXT DEFAULT 'Streetwear'; ALTER TABLE products ADD COLUMN price_kobo INTEGER DEFAULT 3000000; UPDATE products SET id=slug; CREATE TABLE product_variants(id TEXT,product_id TEXT,active INTEGER,stock INTEGER); CREATE TABLE stock_reservations(variant_id TEXT,quantity INTEGER,expires_at TEXT); INSERT INTO product_variants VALUES('first-m','first-drop',1,2);");
const db={prepare(sql){const statement=sqlite.prepare(sql);return {all:async()=>({results:statement.all()}),bind(...args){return {first:async()=>statement.get(...args)??null}}}}};
const request=query=>new Request('https://api.vantanoir.store/api/storefront-visibility?'+query);
test('draft and archived garments expose no name or metadata; republishing restores them',async()=>{
 for(const status of ['draft','archived']){
  sqlite.prepare('UPDATE products SET status=?, active=0 WHERE slug=?').run(status,'later-drop');
  const response=await storefrontVisibility(request('slug=later-drop'),db);
  assert.equal(response.status,404);assert.deepEqual(await response.json(),{});assert.match(response.headers.get('Cache-Control'),/no-store/);
  const map=await storefrontVisibility(request('mode=sitemap'),db);assert.deepEqual((await map.json()).slugs,['first-drop']);
 }
 sqlite.exec("UPDATE products SET active=1,status='published' WHERE slug='later-drop'");
 const restored=await storefrontVisibility(request('slug=later-drop'),db);assert.equal(restored.status,200);assert.equal((await restored.json()).title,'Later Drop | Vanta Noir');
 assert.deepEqual((await (await storefrontVisibility(request('mode=sitemap'),db)).json()).slugs,['first-drop','later-drop']);
});
test('outage never returns a fallback catalogue, and invalid slugs are rejected',async()=>{
 const broken={prepare(){throw Error('offline')}};
 assert.equal((await storefrontVisibility(request('slug=first-drop'),broken)).status,503);
 assert.equal((await storefrontVisibility(request('slug=../../secret'),broken)).status,404);
});
test('removed variants disappear from a saved bag',()=>{
 const bag=[{productId:'hidden',variantId:'hidden-m',name:'Hidden garment',size:'M',color:'Black',imageUrl:'/old.webp',priceKobo:100,quantity:1}];
 assert.deepEqual(reconcileCart(bag,[]),[]);
});
test('storefront has no snapshot fallback or unavailable-product message',async()=>{
 const source=await readFile('app/storefront.tsx','utf8');
 assert.match(source,/useState<CatalogProduct\[\]>\(\[\]\)/);
 assert.match(source,/window\.location\.replace\("\/#collection"\)/);
 assert.doesNotMatch(source,/This piece is unavailable/);
 const renderer=await readFile('portable/render.tsx','utf8');
 assert.match(renderer,/const initial: CatalogProduct\[\] = \[\]/);
 const config=await readFile('portable/namecheap.htaccess','utf8');
 assert.match(config,/storefront-gateway\.php/);
});

test('live product search markup reflects stock and omits preview offers',async()=>{
 const metadata=async()=>(await (await storefrontVisibility(request('slug=first-drop'),db)).json()).structuredData;
 assert.equal((await metadata()).offers.availability,'https://schema.org/InStock');
 sqlite.exec("INSERT INTO stock_reservations VALUES('first-m',2,'2999-01-01')");
 assert.equal((await metadata()).offers.availability,'https://schema.org/OutOfStock');
 sqlite.exec(`UPDATE products SET details_json='{"availability":"preview"}' WHERE slug='first-drop'`);
 assert.equal((await metadata()).offers,undefined);
});
