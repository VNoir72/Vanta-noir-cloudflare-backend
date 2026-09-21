import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
// Read-only unless --apply is supplied. No customer data is printed.
const apply=process.argv.includes('--apply');
const mode=process.argv.includes('--local')?'--local':'--remote';
const config='wrangler.deploy.jsonc';
const wrangler=resolve('node_modules/wrangler/bin/wrangler.js');
function run(args,json=false){const r=spawnSync(process.execPath,[wrangler,...args,'--config',config],{encoding:'utf8',maxBuffer:32*1024*1024});if(r.status!==0)throw new Error(r.stderr||r.stdout||'Wrangler failed');if(!json){return r.stdout;}try{return JSON.parse(r.stdout);}catch{throw new Error('Expected JSON from Wrangler; no database write attempted for this step.');}}
function query(sql){const result=run(['d1','execute','DB',mode,'--command',sql,'--json'],true);if(!Array.isArray(result)||result.some(r=>r.success===false))throw new Error('Database query failed');return result.flatMap(r=>r.results||[]);}
const schema=query("SELECT name FROM sqlite_master WHERE type='table'");
const names=new Set(schema.map(r=>r.name));
const columns=names.has('products')?query('PRAGMA table_info(products)'):[];
const legacy=columns.some(r=>r.name==='price')&&!columns.some(r=>r.name==='price_kobo');
if(columns.length&&!legacy&&!columns.some(r=>r.name==='price_kobo'))throw new Error('Unknown products schema. Stopped without changing data.');
const tables=['products','variants','product_images','product_media','inventory_adjustments','orders','order_items','discounts'];
const archive=tables.filter(t=>legacy&&names.has(t));
for(const table of archive)if(names.has('legacy_v01_'+table))throw new Error('Both current and archived legacy tables exist. Review the previous upgrade before continuing.');
console.log(JSON.stringify({mode,apply,schema:legacy?'v0.1':columns.length?'integrated':'empty',tablesToPreserve:archive},null,2));
if(!apply){console.log('Read-only check complete. Run npm run db:upgrade -- --apply to back up and apply.');process.exit(0);}
mkdirSync('backups',{recursive:true});
const stamp=new Date().toISOString().replaceAll(':','-');
const backup=resolve(`backups/before-integration-${stamp}.sql`);
run(['d1','export','DB',mode,'--output',backup]);
if(statSync(backup).size<1)throw new Error('Backup is empty; upgrade stopped.');
console.log('Database backup saved. Preserve this file privately.');
if(archive.length){const path=resolve('backups/archive-v01.sql');writeFileSync(path,archive.map(t=>`ALTER TABLE ${t} RENAME TO legacy_v01_${t};`).join('\n'));run(['d1','execute','DB',mode,'--file',path,'--yes']);}
run(['d1','migrations','apply','DB',mode]);
const currentNames=new Set(query("SELECT name FROM sqlite_master WHERE type='table'").map(r=>r.name));
if(currentNames.has('legacy_v01_products')){
 // The prototype's price unit was unspecified. Do not guess a sellable price.
 const sql=[`INSERT OR IGNORE INTO products(id,slug,name,category,description,price_kobo,image_url,image_alt,active,status,featured,sort_order,created_at,updated_at)
 SELECT 'legacy-'||id,'legacy-'||slug,name,category,description,0,'/images/vanta-noir-emblem-480.webp',name,0,CASE WHEN status='archived' THEN 'archived' ELSE 'draft' END,featured,0,created_at,updated_at FROM legacy_v01_products;`];
 if(currentNames.has('legacy_v01_variants'))sql.push(`INSERT OR IGNORE INTO product_variants(id,product_id,sku,size,color,color_hex,stock,active,created_at,updated_at) SELECT 'legacy-'||id,'legacy-'||product_id,'LEGACY-'||sku,CASE WHEN upper(size) IN ('S','M','L','XL','XXL') THEN upper(size) ELSE 'Size pending' END,colour,'#101112',stock,1,created_at,updated_at FROM legacy_v01_variants;`);
 const path=resolve('backups/import-v01-drafts.sql');writeFileSync(path,sql.join('\n'));run(['d1','execute','DB',mode,'--file',path,'--yes']);
}
// Import seed catalogue only once. Stock in this launch seed is zero.
const marker=query("SELECT value FROM store_meta WHERE key='catalog_seeded'");
if(!marker.length)run(['d1','execute','DB',mode,'--file','portable/catalog-import.sql','--yes']);
console.log('Upgrade finished. Earlier records remain under legacy_v01_*; imported products are drafts. Deploy the built Worker next.');
