import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
// Read-only by default. Applies only the additive rewards migration; never seeds stock or changes offers.
const apply=process.argv.includes('--apply'),mode=process.argv.includes('--local')?'--local':'--remote';
const wrangler=resolve('node_modules/wrangler/bin/wrangler.js'),config='wrangler.deploy.jsonc';
function run(args,json=false){const r=spawnSync(process.execPath,[wrangler,...args,'--config',config],{encoding:'utf8',maxBuffer:64*1024*1024});if(r.status!==0)throw new Error(r.stderr||r.stdout||'Database command failed.');if(!json)return r.stdout;return JSON.parse(r.stdout);}
function query(sql){const r=run(['d1','execute','DB',mode,'--command',sql,'--json'],true);if(!Array.isArray(r)||r.some(x=>x.success===false))throw new Error('Database check failed.');return r.flatMap(x=>x.results||[]);}
const tables=new Set(query("SELECT name FROM sqlite_master WHERE type='table'").map(r=>r.name));
const columns=table=>tables.has(table)?query(`PRAGMA table_info(${table})`).map(r=>r.name):[];
for(const [table,required] of Object.entries({orders:['id','promotion_code','discount_kobo','allocation_token','paid_at'],order_items:['id','order_id','variant_id','unit_price_kobo'],stock_reservations:['variant_id','quantity','expires_at'],admin_audit:['actor','action','entity','detail'],store_meta:['key','value'],promotions:['version']})){
 const present=columns(table);if(required.some(c=>!present.includes(c)))throw new Error(`Expected integrated store schema in ${table}. Stopped without changing data.`);
}
const campaignColumns=columns('reward_campaigns'),orderColumns=columns('order_rewards'),giftColumn=columns('order_items').includes('is_gift');
const present=campaignColumns.length>0||orderColumns.length>0||giftColumn;
if(present){
 if(['id','config_json','code','version','active','starts_at','ends_at'].some(c=>!campaignColumns.includes(c))||['order_id','campaign_id','title','shipping_savings_kobo','gift_variant_id','max_uses'].some(c=>!orderColumns.includes(c))||!giftColumn)throw new Error('Partial rewards schema found. Stopped; review the backup and migration before retrying.');
 console.log('Rewards schema is already installed. No changes made.');process.exit(0);
}
console.log(`Rewards schema is ready to add (${mode.slice(2)}). Existing orders, inventory and settings will be preserved.`);
if(!apply){console.log('Read-only check complete. Use npm run db:rewards -- --apply to back up and install.');process.exit(0);}
mkdirSync('backups',{recursive:true});const stamp=new Date().toISOString().replaceAll(':','-'),backup=resolve(`backups/before-rewards-${stamp}.sql`);
run(['d1','export','DB',mode,'--output',backup]);if(statSync(backup).size<1)throw new Error('Backup is empty; installation stopped.');
const migration='0008_editable_rewards.sql',path=resolve(`backups/rewards-migration-${stamp}.sql`);
const sql=readFileSync('drizzle/'+migration,'utf8').replaceAll('--> statement-breakpoint','')+`\nCREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);\nINSERT OR IGNORE INTO d1_migrations(name) VALUES ('${migration}');\n`;
writeFileSync(path,sql);run(['d1','execute','DB',mode,'--file',path,'--yes']);
console.log('Rewards installed. No offers were activated. Keep the private backup at '+backup);
