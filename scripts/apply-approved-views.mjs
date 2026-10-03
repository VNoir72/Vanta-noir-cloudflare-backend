import {spawnSync} from 'node:child_process';
import {readFileSync,mkdirSync,statSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const rows=JSON.parse(readFileSync('data/catalogue-approved-view-updates.json','utf8'));
const apply=process.argv.includes('--apply'),mode=process.argv.includes('--local')?'--local':'--remote';
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
const run=args=>{const r=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),...args,'--config','wrangler.deploy.jsonc'],{encoding:'utf8',maxBuffer:64*1024*1024});if(r.status!==0)throw Error(r.stderr||r.stdout);return r.stdout;};
const sql=[];
for(const row of rows){
 const where=`product_id=${quote(row.productId)} AND color=${quote(row.color)}`;
 // Only amend reviewed catalogue sources; keep all merchant-uploaded images.
 const existingSide=row.existingSide??'left',newSide=existingSide==='left'?'right':'left';
 const order={front:0,back:1,left:2,right:3};
 sql.push(`INSERT INTO product_images(id,product_id,color,image_url,image_alt,sort_order) SELECT ${quote('approved-r03-'+row.productId+'-'+row.color.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+newSide)},${quote(row.productId)},${quote(row.color)},${quote(row.views[newSide])},${quote(row.color+', '+newSide+' view')},${order[newSide]} WHERE EXISTS(SELECT 1 FROM product_images WHERE ${where} AND image_url=${quote(row.legacyFront)}) AND NOT EXISTS(SELECT 1 FROM product_images WHERE ${where} AND image_url=${quote(row.views[newSide])});`);
 for(const [n,view] of ['front','back',existingSide].entries())sql.push(`UPDATE product_images SET image_url=${quote(row.views[view])},image_alt=${quote(row.color+', '+view+' view')},sort_order=${order[view]} WHERE ${where} AND image_url=${quote(row.legacyImages[n])};`);
 sql.push(`UPDATE products SET image_url=${quote(row.views.front)} WHERE id=${quote(row.productId)} AND image_url=${quote(row.legacyFront)};`);
}
if(!apply){console.log(`${rows.length} reviewed colourways ready. No database changes made. Run node scripts/apply-approved-views.mjs --apply after uploading the image assets.`);process.exit(0)}
mkdirSync('backups',{recursive:true});const stamp=new Date().toISOString().replaceAll(':','-'),backup=resolve(`backups/before-approved-views-${stamp}.sql`);
run(['d1','export','DB',mode,'--output',backup]);if(statSync(backup).size===0)throw Error('Empty backup; stopped.');
const path=resolve(`backups/approved-views-${stamp}.sql`);writeFileSync(path,sql.join('\n'));
run(['d1','execute','DB',mode,'--file',path,'--yes']);console.log('Reviewed image URLs applied. Stock, prices and orders were not changed. Backup: '+backup);
