import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {getDbBinding} from '@/lib/runtime-env';
import {getAdminProduct} from '@/lib/store-db';
import {LAUNCH_CHECKS,launchIssues} from '@/lib/launch-review.mjs';
import {z} from 'zod';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
// One SQLite statement captures the exact product, gallery and variant revision.
// The same expression guards mutations atomically against concurrent edits/sales.
const revisionSQL=`json_object('id',p.id,'name',p.name,'description',p.description,'category',p.category,'price',p.price_kobo,'status',p.status,'details',p.details_json,'updated',p.updated_at,'image',p.image_url,'images',(SELECT json_group_array(json_object('id',id,'url',image_url,'alt',image_alt,'color',color,'sort',sort_order)) FROM (SELECT * FROM product_images WHERE product_id=p.id ORDER BY id)),'variants',(SELECT json_group_array(json_object('id',id,'size',size,'color',color,'sku',sku,'stock',stock,'active',active)) FROM (SELECT * FROM product_variants WHERE product_id=p.id ORDER BY id)))`;
async function setup(){await getDbBinding().prepare(`CREATE TABLE IF NOT EXISTS product_launch_reviews (product_id TEXT PRIMARY KEY, revision TEXT NOT NULL, mode TEXT NOT NULL, actor TEXT NOT NULL, certified_at TEXT NOT NULL, launched_at TEXT)`).run();}
async function snapshot(id:string){return getDbBinding().prepare(`SELECT ${revisionSQL} AS revision FROM products p WHERE p.id=?`).bind(id).first<{revision:string}>();}
async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('');}
export async function GET(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status,headers});
 try {await setup();const id=new URL(request.url).searchParams.get('id')||'';const before=await snapshot(id);const product=await getAdminProduct(id);const after=await snapshot(id);if(!before||!product)return Response.json({error:'Product not found.'},{status:404,headers});if(before.revision!==after?.revision)return Response.json({error:'Product changed. Reload review.'},{status:409,headers});
 const revision=await digest(before.revision);const certification=await getDbBinding().prepare('SELECT mode,actor,certified_at,launched_at,revision FROM product_launch_reviews WHERE product_id=?').bind(id).first<{mode:string;actor:string;certified_at:string;launched_at:string|null;revision:string}>();
 return Response.json({product,revision,certification:certification?{...certification,current:certification.revision===revision}:null},{headers});
 }catch{return Response.json({error:'Launch review could not load.'},{status:500,headers});}
}
const schema=z.object({productId:z.string().min(1).max(160),revision:z.string().regex(/^[a-f0-9]{64}$/),mode:z.enum(['in_stock','preorder']),action:z.enum(['certify','launch']),checks:z.record(z.string(),z.boolean())});
export async function POST(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status,headers});
 if(auth.role!=='owner')return Response.json({error:'Only the owner can certify or launch a product.'},{status:403,headers});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:'Complete the launch review.'},{status:400,headers});
 const input=parsed.data;
 try {await setup();const before=await snapshot(input.productId);const product=await getAdminProduct(input.productId);const after=await snapshot(input.productId);
 if(!before||!product)return Response.json({error:'Product not found.'},{status:404,headers});
 if(before.revision!==after?.revision||await digest(before.revision)!==input.revision)return Response.json({error:'Product, images or stock changed. Reload and review the latest version.'},{status:409,headers});
 const issues=launchIssues(product,input.mode);if(issues.length)return Response.json({error:issues.join(' ')},{status:400,headers});
 if(Object.keys(LAUNCH_CHECKS).some(key=>input.checks[key]!==true))return Response.json({error:'Complete every owner certification checkbox.'},{status:400,headers});
 const db=getDbBinding();let result;
 if(input.action==='certify'){
 result=await db.prepare(`INSERT INTO product_launch_reviews(product_id,revision,mode,actor,certified_at,launched_at) SELECT p.id,?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now'),NULL FROM products p WHERE p.id=? AND ${revisionSQL}=? ON CONFLICT(product_id) DO UPDATE SET revision=excluded.revision,mode=excluded.mode,actor=excluded.actor,certified_at=excluded.certified_at,launched_at=NULL`).bind(input.revision,input.mode,auth.email,input.productId,before.revision).run();
 }else{
 // JSON updates preserve all manufacturer fields and never change inventory quantities.
 result=await db.prepare(`UPDATE products AS p SET status='published',active=1,details_json=json_set(COALESCE(details_json,'{}'),'$.priceStatus','approved','$.availability',?,'$.releaseDate',date('now')),updated_at=CURRENT_TIMESTAMP WHERE p.id=? AND ${revisionSQL}=? AND EXISTS(SELECT 1 FROM product_launch_reviews r WHERE r.product_id=p.id AND r.revision=? AND r.mode=? AND r.launched_at IS NULL)`).bind(input.mode,input.productId,before.revision,input.revision,input.mode).run();
 if(result.meta.changes)await db.prepare("UPDATE product_launch_reviews SET launched_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE product_id=? AND revision=?").bind(input.productId,input.revision).run();
 }
 if(!result.meta.changes)return Response.json({error:'Review expired or product changed. Reload and certify the latest version.'},{status:409,headers});
 return Response.json({ok:true,product:await getAdminProduct(input.productId)},{headers});
 }catch{return Response.json({error:'Could not save launch review. Reload to check its current state before retrying.'},{status:500,headers});}
}
