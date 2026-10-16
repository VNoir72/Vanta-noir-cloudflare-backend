import fs from 'node:fs';
import {approvedSpecificationText} from '../../lib/specification-approval.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node approve-catalogue.mjs snapshot.json approved.json');
const data=JSON.parse(fs.readFileSync(input));
const revision='owner-approved-20261015-r07';
const sqlValue=x=>"'"+String(x).replaceAll("'","''")+"'";
const sql=[`CREATE TABLE IF NOT EXISTS catalogue_approval_snapshots (revision TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, snapshot_json TEXT NOT NULL, PRIMARY KEY (revision,kind,id));`];
const drafts=new Set(data.products.filter(p=>p.status==='draft').map(p=>p.id));
for(const p of data.products){
 const old=p.details_json,d=JSON.parse(old);
 for(const [key,value] of Object.entries(d))if(typeof value==='string')d[key]=approvedSpecificationText(value);
 d.specificationStatus='approved';d.specificationApprovedAt='2026-10-15';
 if(d.sizeGuide){d.sizeGuide.status='approved';d.sizeGuide.notes=approvedSpecificationText(d.sizeGuide.notes);}
 // Keep publication, fulfilment mode, prices, colourways and all numeric values.
 sql.push(`INSERT OR IGNORE INTO catalogue_approval_snapshots SELECT '${revision}','product',id,${sqlValue(JSON.stringify(p))} FROM products WHERE id=${sqlValue(p.id)} AND details_json=${sqlValue(old)};`);
 p.details_json=JSON.stringify(d);
 sql.push(`UPDATE products SET details_json=${sqlValue(p.details_json)},updated_at=CURRENT_TIMESTAMP WHERE id=${sqlValue(p.id)} AND details_json=${sqlValue(old)};`);
}
let stockVariants=0,dimensionsAssigned=0;
for(const v of data.product_variants){
 const add=drafts.has(v.product_id)&&v.active===1;
 const assign=v.size==='Size pending';
 if(!add&&!assign)continue;
 if(assign&&data.product_variants.some(other=>other.id!==v.id&&other.product_id===v.product_id&&other.color===v.color&&other.size==='One size'))throw Error('Duplicate one-size variant: '+v.id);
 const guard=`id=${sqlValue(v.id)} AND stock=${v.stock} AND size=${sqlValue(v.size)} AND updated_at=${sqlValue(v.updated_at)}`;
 sql.push(`INSERT OR IGNORE INTO catalogue_approval_snapshots SELECT '${revision}','variant',id,${sqlValue(JSON.stringify(v))} FROM product_variants WHERE ${guard};`);
 if(add){
  // Idempotent receipt: the same approval can never increment stock twice.
  sql.push(`INSERT INTO stock_adjustments(variant_id,old_stock,new_stock,reason,actor) SELECT id,stock,stock+3,'${revision}','owner instruction' FROM product_variants WHERE ${guard} AND NOT EXISTS(SELECT 1 FROM stock_adjustments a WHERE a.variant_id=product_variants.id AND a.reason='${revision}');`);
  sql.push(`UPDATE product_variants SET stock=stock+3,updated_at=CURRENT_TIMESTAMP WHERE ${guard} AND EXISTS(SELECT 1 FROM stock_adjustments a WHERE a.variant_id=product_variants.id AND a.reason='${revision}' AND a.old_stock=product_variants.stock AND a.new_stock=product_variants.stock+3);`);
  v.stock+=3;stockVariants++;
 }
 if(assign){sql.push(`UPDATE product_variants SET size='One size',updated_at=CURRENT_TIMESTAMP WHERE id=${sqlValue(v.id)} AND size='Size pending';`);v.size='One size';dimensionsAssigned++;}
}
fs.writeFileSync(output,JSON.stringify(data));
fs.writeFileSync(output.replace(/\.json$/,'.sql'),sql.join('\n'));
console.log(JSON.stringify({revision,products:data.products.length,drafts:drafts.size,stockVariants,additionalUnits:stockVariants*3,dimensionsAssigned}));
