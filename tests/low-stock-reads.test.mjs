import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';
import {mkdir,readFile,readdir} from 'node:fs/promises';

test('low-stock checks use an index and skip inventory after queuing; retries still send',async()=>{
 await mkdir('work',{recursive:true});
 await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/low-stock-test.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 let attempts=0;
 const mf=new Miniflare({modules:true,scriptPath:'work/low-stock-test.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{ADMIN_EMAIL:'owner@example.com',RESEND_API_KEY:'local-test',EMAIL_FROM:'Vanta Noir <test@example.com>'},outboundService:async()=>{attempts++;return attempts===1?Response.json({error:'temporary'},{status:503}):Response.json({id:'delivered'});}});
 try{
 const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){const sql=(await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','');await db.batch(sql.split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));}
 const rpc=async(action,...args)=>{const r=await mf.dispatchFetch('https://test.local/test',{method:'POST',body:JSON.stringify({action,args})});const d=await r.json();assert.equal(r.status,200,JSON.stringify(d));return d;};
 await rpc('listCatalog');
 const plan=await db.prepare("EXPLAIN QUERY PLAN SELECT p.name,v.sku,v.stock FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.active=1 AND p.status='published' AND v.stock<=5 ORDER BY v.stock,v.sku LIMIT 100").all();
 assert.ok(plan.results.some(r=>r.detail.includes('product_variants_low_stock_idx')));assert.ok(!plan.results.some(r=>r.detail.includes('TEMP B-TREE')));
 await rpc('queueLowStockAlerts');
 const key='low-stock:'+new Date().toISOString().slice(0,10);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM email_outbox WHERE event_key=?').bind(key).first()).n,1);
 // Make a scan fail in this isolated test DB: the queued-message path must not touch it.
 await db.exec('ALTER TABLE product_variants RENAME TO test_variants_saved');
 await rpc('queueLowStockAlerts');
 await rpc('processEmailOutbox');
 assert.equal(attempts,1);
 await rpc('queueLowStockAlerts');
 await db.prepare("UPDATE email_outbox SET next_attempt_at=datetime('now','-1 minute') WHERE event_key=?").bind(key).run();
 await rpc('processEmailOutbox');
 assert.equal(attempts,2);
 assert.equal((await db.prepare('SELECT status FROM email_outbox WHERE event_key=?').bind(key).first()).status,'sent');
 await rpc('queueLowStockAlerts');
 await db.exec('ALTER TABLE test_variants_saved RENAME TO product_variants');
 await db.prepare("UPDATE email_outbox SET event_key='low-stock:2000-01-01' WHERE event_key=?").bind(key).run();
 await rpc('queueLowStockAlerts');
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM email_outbox WHERE event_key=?').bind(key).first()).n,1,'A new day can queue a new notification');
 }finally{await mf.dispose();}
});
