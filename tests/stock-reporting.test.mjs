import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';
import {mkdir,readdir,readFile} from 'node:fs/promises';

test('inventory automation and daily summary match dashboard stock, count beyond 100, and honour reservations', async()=>{
 await mkdir('work',{recursive:true});
 await build({entryPoints:['tests/automations-worker.ts'],outfile:'work/stock-reporting.mjs',bundle:true,format:'esm',platform:'neutral',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const mf=new Miniflare({modules:true,scriptPath:'work/stock-reporting.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{ADMIN_EMAIL:'owner@example.com'}});
 try {
  const db=await mf.getD1Database('DB');
  for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  await db.prepare("UPDATE products SET status='draft'").run();
  const rpc=async(action,...args)=>{const r=await mf.dispatchFetch('https://test/rpc',{method:'POST',body:JSON.stringify({action,args})});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;};
  for(const [id,status] of [['live','published'],['draft','draft'],['archived','archived']])await db.prepare("INSERT INTO products(id,slug,name,category,description,price_kobo,image_url,image_alt,status) VALUES(?,?,?,'Tops','Test',10000,'/test.png','Test',?)").bind(id,id,id,status).run();
  const variant=(id,stock,product='live',active=1)=>db.prepare("INSERT INTO product_variants(id,product_id,sku,size,color,stock,active) VALUES(?,?,?,'L','Black',?,?)").bind(id,product,id,stock,active);
  await db.batch([...Array.from({length:125},(_,i)=>variant('low-'+i,3)),...Array.from({length:141},(_,i)=>variant('out-'+i,0)),variant('reserved-low',10),variant('reserved-out',3),variant('expired',10),variant('draft',1,'draft'),variant('archived',0,'archived'),variant('inactive',1,'live',0)]);
  await db.prepare("INSERT INTO orders(id,reference,email,first_name,last_name,phone,address_line_1,city,state,subtotal_kobo,total_kobo) VALUES('order','VN-TEST','test@example.com','Test','Buyer','123456789','Street','City','State',10000,10000)").run();
  for(const [id,quantity,expires] of [['reserved-low',8,'+1 hour'],['reserved-out',3,'+1 hour'],['expired',10,'-1 hour']])await db.prepare("INSERT INTO stock_reservations(id,order_id,variant_id,quantity,expires_at) VALUES(?, 'order',?,?,datetime('now',?))").bind('r-'+id,id,quantity,expires).run();
  let run=await rpc('runAutomation','inventory','owner');
  assert.equal(run.status,'succeeded');assert.deepEqual(run.result,{lowStock:126,outOfStock:142});
  const mail=await db.prepare("SELECT body FROM email_outbox WHERE event_key LIKE 'automation:inventory:%'").first();
  assert.match(mail.body,/Low-stock variants: 126/);assert.match(mail.body,/Out-of-stock variants: 142/);assert.match(mail.body,/Showing 100 of 126/);assert.match(mail.body,/Showing 100 of 142/);assert.match(mail.body,/2 available \(10 recorded, 8 reserved\)/);
  let rule=await rpc('automationRule','summary');await rpc('saveAutomation',{id:'summary',enabled:true,version:rule.version,config:{...rule.config,summaryHour:0}},'owner');
  run=await rpc('runAutomation','summary','owner');assert.equal(run.status,'succeeded');assert.deepEqual(run.result.low,{count:126,outOfStock:142});
  rule=await rpc('automationRule','inventory');await rpc('saveAutomation',{id:'inventory',enabled:true,version:rule.version,config:{...rule.config,lowStockThreshold:0}},'owner');
  run=await rpc('runAutomation','inventory','owner');assert.deepEqual(run.result,{lowStock:0,outOfStock:142});
  run=await rpc('runAutomation','summary','owner');assert.deepEqual(run.result.low,{count:0,outOfStock:142});
 }finally{await mf.dispose();}
});
