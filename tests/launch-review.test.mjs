import test from 'node:test';
import assert from 'node:assert/strict';
import {isUnlaunched,launchIssues,LAUNCH_CHECKS} from '../lib/launch-review.mjs';
import {constructionProposal,MANUFACTURING_FIELDS} from '../lib/manufacturing-specs.mjs';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';
import {mkdir} from 'node:fs/promises';
test('launch queue includes published previews and protects every manufacturing field',()=>{
 assert.equal(isUnlaunched({status:'published',details:{priceStatus:'proposed',availability:'preview'}}),true);
 assert.equal(isUnlaunched({status:'published',details:{priceStatus:'approved',availability:'in_stock'}}),false);
 assert.equal(isUnlaunched({status:'archived'}),false);
 assert(launchIssues({details:{},images:[],variants:[]},'in_stock').some(s=>s.includes('stitching')));
 const jersey=constructionProposal({name:'Custom Tee'},{fabric:'cotton jersey'});assert.match(jersey.stitching,/514/);assert.match(jersey.stitching,/406/);
 const shirt=constructionProposal({name:'Panel Shirt'},{fabric:'woven cotton'});assert.match(shirt.stitching,/301/);
 assert.match(constructionProposal({name:'Socks'},{}).stitching,/Specialist/);
 assert.equal(constructionProposal({name:'Tee'},{stitching:'Custom exact 406 seam schedule'}).stitching,'Custom exact 406 seam schedule');
 assert.match(constructionProposal({name:'Tee'},{stitching:'Reinforced shoulder seams'}).stitching,/514/);
 assert.match(jersey.artworkLock,/anime/);
});
test('owner certification is separate from launch; stale stock and missing specifications block release',async()=>{
 await mkdir('work',{recursive:true});
 await build({stdin:{contents:`import * as route from './app/api/admin/launch-review/route.ts';export default {fetch:r=>r.method==='GET'?route.GET(r):route.POST(r)};`,resolveDir:process.cwd()},outfile:'work/launch-review-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',external:['cloudflare:workers'],plugins:[{name:'review-fixture',setup(b){
 b.onResolve({filter:/^@\/lib\/(admin-auth|store-db)$/},a=>({path:a.path,namespace:'review-fixture'}));
 b.onLoad({filter:/.*/,namespace:'review-fixture'},a=>({loader:'ts',resolveDir:process.cwd(),contents:a.path.endsWith('admin-auth')?`export async function adminAuthStateFromRequest(r){return r.headers.get('x-role')==='owner'?{ok:true,role:'owner',email:'owner@test.invalid'}:{ok:false,status:403,error:'Owner only'}}`:`import {env} from 'cloudflare:workers';import {productDetails} from '${process.cwd()}/lib/product-details.ts';export async function getAdminProduct(id){const p=await env.DB.prepare('SELECT * FROM products WHERE id=?').bind(id).first();if(!p)return null;return {id:p.id,name:p.name,status:p.status,priceKobo:p.price_kobo,details:productDetails(p.details_json),images:(await env.DB.prepare('SELECT * FROM product_images WHERE product_id=?').bind(id).all()).results,variants:(await env.DB.prepare('SELECT * FROM product_variants WHERE product_id=?').bind(id).all()).results};}`}));
 }}]});
 const mf=new Miniflare({modules:true,scriptPath:'work/launch-review-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB']});
 try{
 const db=await mf.getD1Database('DB');
 await db.batch([
 `CREATE TABLE products(id TEXT PRIMARY KEY,name TEXT,description TEXT,category TEXT,price_kobo INTEGER,status TEXT,details_json TEXT,updated_at TEXT,image_url TEXT,active INTEGER)`,
 `CREATE TABLE product_images(id TEXT PRIMARY KEY,product_id TEXT,image_url TEXT,image_alt TEXT,color TEXT,sort_order INTEGER)`,
 `CREATE TABLE product_variants(id TEXT PRIMARY KEY,product_id TEXT,size TEXT,color TEXT,sku TEXT,stock INTEGER,active INTEGER)`,
 `INSERT INTO products VALUES('p','Custom Tee','Design','Tops',5500000,'draft','{}','2026-10-08','/images/p.webp',0)`,
 `INSERT INTO product_images VALUES('i','p','/images/p.webp','Front','Black',0)`,
 `INSERT INTO product_variants VALUES('v','p','M','Black','VN-P-M',4,1)`
 ].map(sql=>db.prepare(sql)));
 const request=(method,body,role='owner')=>mf.dispatchFetch('https://test.invalid/api/admin/launch-review?id=p',{method,headers:{'x-role':role,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await request('GET',null,'staff')).status,403);
 let review=await request('GET').then(r=>r.json());const checks=Object.fromEntries(Object.keys(LAUNCH_CHECKS).map(k=>[k,true]));
 const action=(name,revision=review.revision)=>request('POST',{productId:'p',revision,mode:'in_stock',action:name,checks});
 assert.equal((await action('certify')).status,400);
 // Use the real schema default guide shape; no fabrication is written to the live database.
 const guide={status:'confirmed',sections:[{kind:'top',title:'Tee',rows:[{size:'M',chest:55,length:72}]}],notes:''};
 const details={fabric:'Cotton jersey',features:'Asymmetric original artwork',care:'Approved wash care',sizeGuide:guide,...Object.fromEntries(MANUFACTURING_FIELDS.map(k=>[k,'Saved approved style-specific '+k]))};
 await db.prepare('UPDATE products SET details_json=? WHERE id=?').bind(JSON.stringify(details),'p').run();
 review=await request('GET').then(r=>r.json());
 assert.equal(review.product.details.stitching,details.stitching,'Manufacturing fields survive parsing');
 const cert=await action('certify');assert.equal(cert.status,200,JSON.stringify(await cert.json()));
 assert.equal((await db.prepare("SELECT status FROM products WHERE id='p'").first()).status,'draft');
 await db.prepare("UPDATE product_variants SET stock=3 WHERE id='v'").run();
 assert.equal((await action('launch')).status,409,'A sale invalidates the old approval');
 review=await request('GET').then(r=>r.json());assert.equal(review.certification.current,false);
 assert.equal((await action('launch')).status,409,'A fresh review needs certification');
 assert.equal((await action('certify')).status,200);
 assert.equal((await action('launch')).status,200);
 const live=await db.prepare("SELECT * FROM products WHERE id='p'").first();assert.equal(live.status,'published');assert.equal(JSON.parse(live.details_json).priceStatus,'approved');assert.equal(JSON.parse(live.details_json).stitching,details.stitching);
 assert.equal((await db.prepare("SELECT stock FROM product_variants WHERE id='v'").first()).stock,3);
 assert.equal((await action('launch')).status,409,'Cannot reuse an old certification');
 }finally{await mf.dispose();}
});
