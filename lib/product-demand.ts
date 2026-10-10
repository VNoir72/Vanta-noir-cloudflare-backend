import {z} from 'zod';
import {getDbBinding} from './runtime-env';
export const interestSchema=z.object({visitorId:z.string().uuid(),productId:z.string().min(1).max(160),color:z.string().trim().min(1).max(100),size:z.string().trim().max(40).default(''),liked:z.boolean()}).strict();
export async function saveInterest(input:z.infer<typeof interestSchema>) {
 const db=getDbBinding();
 // Removing a saved design also works after the owner unpublishes it.
 if(!input.liked){await db.prepare('DELETE FROM product_interest WHERE visitor_id=? AND product_id=? AND color=?').bind(input.visitorId,input.productId,input.color).run();return;}
 const result=await db.prepare(`INSERT INTO product_interest(visitor_id,product_id,color,size)
 SELECT ?,p.id,?,? FROM products p WHERE p.id=? AND p.active=1 AND p.status='published'
 AND EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.active=1 AND v.color=? AND (?='' OR v.size=?))
 ON CONFLICT(visitor_id,product_id,color) DO UPDATE SET size=CASE WHEN excluded.size='' THEN product_interest.size ELSE excluded.size END,updated_at=CURRENT_TIMESTAMP`)
 .bind(input.visitorId,input.color,input.size,input.productId,input.color,input.size,input.size).run();
 if(!result.meta.changes)throw new Error('This design or size is no longer available to save. Refresh the collection.');
}
export type DemandRow={productId:string;name:string;status:string;launchGroup:string;availability:string;priceStatus:string;stock:number;likes:number;recentLikes:number;confirmedAlerts:number;pendingAlerts:number;preferences:Array<{color:string;size:string;likes:number}>};
export async function productDemand():Promise<DemandRow[]> {
 const db=getDbBinding();
 const [products,preferences]=await Promise.all([
 db.prepare(`SELECT p.id productId,p.name,p.status,CASE WHEN p.id IN (SELECT j.value FROM store_meta m,json_each(m.value,'$.launch') j WHERE m.key='launch-selection:2026-10') THEN 'Launch' WHEN p.id IN (SELECT j.value FROM store_meta m,json_each(m.value,'$.preview') j WHERE m.key='launch-selection:2026-10') THEN 'Preview' ELSE '' END launchGroup,json_extract(p.details_json,'$.availability') availability,
 json_extract(p.details_json,'$.priceStatus') priceStatus,
 COALESCE((SELECT SUM(v.stock) FROM product_variants v WHERE v.product_id=p.id AND v.active=1 AND v.size<>'Size pending'),0) stock,
 (SELECT COUNT(DISTINCT i.visitor_id) FROM product_interest i WHERE i.product_id=p.id) likes,
 (SELECT COUNT(DISTINCT i.visitor_id) FROM product_interest i WHERE i.product_id=p.id AND datetime(i.created_at)>=datetime('now','-30 days')) recentLikes,
 (SELECT COUNT(DISTINCT s.email) FROM subscribers s WHERE s.status='active' AND ((s.kind='release' AND s.variant_id=p.id) OR (s.kind='restock' AND s.variant_id IN (SELECT v.id FROM product_variants v WHERE v.product_id=p.id)))) confirmedAlerts,
 (SELECT COUNT(DISTINCT s.email) FROM subscribers s WHERE s.status='pending' AND ((s.kind='release' AND s.variant_id=p.id) OR (s.kind='restock' AND s.variant_id IN (SELECT v.id FROM product_variants v WHERE v.product_id=p.id)))) pendingAlerts
 FROM products p WHERE (p.active=1 AND p.status='published') OR EXISTS(SELECT 1 FROM product_interest i WHERE i.product_id=p.id) OR p.id IN (SELECT j.value FROM store_meta m,json_each(m.value,'$.launch') j WHERE m.key='launch-selection:2026-10')
 ORDER BY likes DESC,confirmedAlerts DESC,p.sort_order,p.name`).all<Omit<DemandRow,'preferences'>>(),
 db.prepare('SELECT product_id productId,color,size,COUNT(*) likes FROM product_interest GROUP BY product_id,color,size ORDER BY likes DESC,color,size').all<{productId:string;color:string;size:string;likes:number}>()
 ]);
 return products.results.map(p=>({...p,preferences:preferences.results.filter(v=>v.productId===p.productId).map(({color,size,likes})=>({color,size,likes}))}));
}
