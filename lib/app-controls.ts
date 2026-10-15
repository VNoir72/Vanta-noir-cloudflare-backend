import { circleMembership } from './circle';
import { getDbBinding } from './runtime-env';
import { appControlsSchema,dropAccess,offerAccess,publicAccess,type AppAccess } from './app-controls-policy';
export {appControlsSchema,publicAccess};
export const APP_CONTROLS_KEY='app-controls:v1';
export async function appControlsSnapshot(){const r=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind(APP_CONTROLS_KEY).first<{value:string}>();return {raw:r?.value||null,config:appControlsSchema.parse(r?JSON.parse(r.value):{})};}
export async function saveAppControls(input:unknown,actor:string){
 const config=appControlsSchema.parse(input),db=getDbBinding();
 for(const d of config.drops)if(!await db.prepare("SELECT id FROM products WHERE id=? AND status<>'archived'").bind(d.productId).first())throw Error('Choose a current product.');
 for(const o of config.offers){const found=o.kind==='promotion'?await db.prepare('SELECT code FROM promotions WHERE code=?').bind(o.code).first():await db.prepare('SELECT code FROM reward_campaigns WHERE code=?').bind(o.code).first();if(!found)throw Error('Create this coupon in Promotions or Rewards first.');}
 const old=await appControlsSnapshot();if(old.config.version!==config.version)throw Error('App controls changed. Reload before saving.');
 const next={...config,version:config.version+1},raw=JSON.stringify(next);
 const result=await db.batch([db.prepare(`INSERT INTO store_meta(key,value) SELECT ?,? WHERE ?=0 OR EXISTS(SELECT 1 FROM store_meta WHERE key=? AND value=?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE store_meta.value=?`).bind(APP_CONTROLS_KEY,raw,config.version,APP_CONTROLS_KEY,old.raw,old.raw),db.prepare(`INSERT INTO admin_audit(actor,action,entity,detail) SELECT ?,'app controls saved','app-controls',? WHERE EXISTS(SELECT 1 FROM store_meta WHERE key=? AND value=?)`).bind(actor,JSON.stringify({version:next.version}),APP_CONTROLS_KEY,raw)]);
 if(!result[0].meta.changes)throw Error('App controls changed. Reload before saving.');
 return next;
}
export async function filterAppCatalog<T extends {id:string}>(products:T[],access:AppAccess=publicAccess){const {config}=await appControlsSnapshot();if(!config.enabled)return products;return products.filter(p=>{const d=config.drops.find(d=>d.productId===p.id);return !d||dropAccess(d,access);});}
export async function enforceOffer(kind:'promotion'|'reward',code:string,access:AppAccess=publicAccess){
 const {config}=await appControlsSnapshot();const rule=config.offers.find(o=>o.kind===kind&&o.code===code.toUpperCase()&&(config.enabled||o.circleOnly));
 if(!rule)return null;
 if(rule.circleOnly&&(!access.verifiedApp||!access.customerId||!(await circleMembership(access.customerId)).active))throw Error('This promotion is for active Circle members in the app.');
 if(!offerAccess(rule,access))throw Error('This promotion is available only in its selected channel. Open the Vanta Noir app for app-only offers.');
 if(!access.customerId)throw Error('Sign in to use this promotion.');
 if(rule.firstPurchase&&await getDbBinding().prepare("SELECT id FROM orders WHERE lower(email)=? AND payment_status='paid' LIMIT 1").bind(access.email).first())throw Error('This promotion is for your first completed purchase.');
 return rule;
}
export type AccessLimit={productId?:string;kind?:string;code?:string;quantity:number;maximum:number;allCustomers?:boolean;firstPurchase?:boolean};
export async function checkoutAppPolicy(cart:{variantId:string;quantity:number}[],promotionCode:string,rewardCode:string,access:AppAccess){
 const snap=await appControlsSnapshot(),limits:AccessLimit[]=[];
 if(snap.config.enabled){
 const rows=await getDbBinding().prepare(`SELECT id,product_id FROM product_variants WHERE id IN (${cart.map(()=>'?').join(',')})`).bind(...cart.map(i=>i.variantId)).all<{id:string;product_id:string}>();
 for(const d of snap.config.drops){const quantity=cart.reduce((n,i)=>n+(rows.results.find(v=>v.id===i.variantId)?.product_id===d.productId?i.quantity:0),0);if(!quantity)continue;
 if(!dropAccess(d,access))throw Error('This item is reserved for app early access or is paused.');
 if(!(d.mode==='early'&&d.publicAt&&Date.now()>=Date.parse(d.publicAt))){limits.push({productId:d.productId,quantity,maximum:d.perCustomer});if(d.allocation)limits.push({productId:d.productId,quantity,maximum:d.allocation,allCustomers:true});}}
 for(const [kind,code] of [['promotion',promotionCode],['reward',rewardCode]] as const){if(!code)continue;const rule=await enforceOffer(kind,code,access);if(rule)limits.push({kind,code:code.toUpperCase(),quantity:1,maximum:rule.perCustomer,firstPurchase:rule.firstPurchase});}
 }
 return {raw:snap.raw,limits,email:access.email};
}
// Executed inside the same INSERT/batch as stock reservations: concurrent checkouts cannot bypass limits.
export const appPolicySql=`COALESCE((SELECT value FROM store_meta WHERE key='app-controls:v1'),'')=? AND NOT EXISTS (
 SELECT 1 FROM json_each(?) lim WHERE
 (json_extract(lim.value,'$.firstPurchase')=1 AND EXISTS(SELECT 1 FROM orders WHERE lower(email)=? AND payment_status='paid')) OR
 json_extract(lim.value,'$.quantity')+COALESCE((SELECT SUM(CASE WHEN json_extract(lim.value,'$.productId') IS NOT NULL THEN (SELECT COALESCE(SUM(quantity),0) FROM order_items WHERE order_id=o.id AND product_id=json_extract(lim.value,'$.productId') AND is_gift=0) ELSE 1 END) FROM orders o WHERE (json_extract(lim.value,'$.allCustomers')=1 OR lower(o.email)=?) AND (o.payment_status='paid' OR (o.status='pending_payment' AND EXISTS(SELECT 1 FROM stock_reservations r WHERE r.order_id=o.id AND r.expires_at>CURRENT_TIMESTAMP))) AND (json_extract(lim.value,'$.productId') IS NOT NULL OR (json_extract(lim.value,'$.kind')='promotion' AND o.promotion_code=json_extract(lim.value,'$.code')) OR (json_extract(lim.value,'$.kind')='reward' AND EXISTS(SELECT 1 FROM order_rewards r JOIN reward_campaigns c ON c.id=r.campaign_id WHERE r.order_id=o.id AND c.code=json_extract(lim.value,'$.code'))))),0)>json_extract(lim.value,'$.maximum'))`;

// Recheck the limits captured at checkout inside the payment allocation UPDATE.
// Exclude this order and include other live reservations so late settlements cannot steal allocations.
export const paidAppLimitExceededSql=`EXISTS (
 SELECT 1 FROM json_each(COALESCE((SELECT value FROM store_meta WHERE key='order-app-limits:'||orders.reference),'[]')) lim
 WHERE (json_extract(lim.value,'$.firstPurchase')=1 AND EXISTS(SELECT 1 FROM orders other WHERE other.id<>orders.id AND lower(other.email)=lower(orders.email) AND other.payment_status='paid')) OR
 json_extract(lim.value,'$.quantity')+COALESCE((SELECT SUM(CASE WHEN json_extract(lim.value,'$.productId') IS NOT NULL THEN (SELECT COALESCE(SUM(quantity),0) FROM order_items WHERE order_id=other.id AND product_id=json_extract(lim.value,'$.productId') AND is_gift=0) ELSE 1 END)
 FROM orders other WHERE other.id<>orders.id AND (json_extract(lim.value,'$.allCustomers')=1 OR lower(other.email)=lower(orders.email))
 AND (other.payment_status='paid' OR (other.status='pending_payment' AND EXISTS(SELECT 1 FROM stock_reservations r WHERE r.order_id=other.id AND r.expires_at>CURRENT_TIMESTAMP)))
 AND (json_extract(lim.value,'$.productId') IS NOT NULL OR (json_extract(lim.value,'$.kind')='promotion' AND other.promotion_code=json_extract(lim.value,'$.code')) OR (json_extract(lim.value,'$.kind')='reward' AND EXISTS(SELECT 1 FROM order_rewards r JOIN reward_campaigns c ON c.id=r.campaign_id WHERE r.order_id=other.id AND c.code=json_extract(lim.value,'$.code'))))),0)>json_extract(lim.value,'$.maximum'))`;
