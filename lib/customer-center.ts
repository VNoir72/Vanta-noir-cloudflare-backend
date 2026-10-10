import {getDbBinding} from './runtime-env';
import {rewardCampaignSchema} from './rewards';
import {rewardCapacitySql} from './rewards-db';

export async function customerCenter(owner:string,email:string) {
 const db=getDbBinding(),now=new Date().toISOString();
 const [items,campaigns]=await Promise.all([
  db.prepare(`SELECT DISTINCT o.reference,oi.product_id AS productId,oi.product_name AS productName
   FROM app_customer_orders a JOIN orders o ON o.reference=a.reference JOIN order_items oi ON oi.order_id=o.id
   WHERE a.customer_id=? AND o.payment_status='paid' AND o.status='delivered'
   AND NOT EXISTS(SELECT 1 FROM product_reviews r WHERE r.order_id=o.id AND r.product_id=oi.product_id)
   ORDER BY o.created_at DESC LIMIT 100`).bind(owner).all(),
  db.prepare(`SELECT c.config_json FROM reward_campaigns c WHERE c.active=1 AND c.starts_at<=? AND c.ends_at>? AND ${rewardCapacitySql}
   AND (json_extract(c.config_json,'$.access')='automatic' OR lower(json_extract(c.config_json,'$.recipientEmail'))=?)
   ORDER BY c.ends_at LIMIT 100`).bind(now,now,email).all<{config_json:string}>()
 ]);
 const coupons=campaigns.results.flatMap(row=>{
  const parsed=rewardCampaignSchema.safeParse(JSON.parse(row.config_json));if(!parsed.success)return [];
  const c=parsed.data;
  // Shared/private codes are never enumerated. Only automatic and assigned offers.
  if(c.access!=='automatic'&&c.recipientEmail!==email)return [];
  return [{id:c.id,title:c.title,code:c.access==='code'?c.code:'',expiresAt:c.endsAt,countries:c.countries,states:c.states,shippingMinimumKobo:c.shippingMinimumKobo,giftMinimumKobo:c.giftMinimumKobo}];
 });
 return {toReview:items.results,coupons};
}
