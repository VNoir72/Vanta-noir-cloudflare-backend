import { getDbBinding, runtimeEnv } from './runtime-env';
import { listCatalog } from './store-db';
import { emailReady, getCommerceSettings, queueEmail } from './commerce-db';
import { checkoutSetupIssues } from './commerce-config';
import { configuredShippingFeeKobo } from './runtime-env';
import { isPaystackConfigured } from './paystack';
import { availableUnits, isPreview, type SalesSignal } from './merchandising';
import { SITE_URL } from './seo';

// Historical payments with no verified environment marker are deliberately excluded.
// Return item quantities are deducted only after a refund is recorded as completed.
export async function salesSignals(): Promise<SalesSignal[]> {
  const result=await getDbBinding().prepare(`WITH net AS (
    SELECT i.product_id,i.order_id,o.paid_at,
      MAX(0,i.quantity-COALESCE((SELECT SUM(CAST(json_extract(j.value,'$.quantity') AS INTEGER))
        FROM return_requests r,json_each(CASE WHEN json_valid(r.items_json) THEN r.items_json ELSE '[]' END) j
        WHERE r.order_id=o.id AND r.refund_status='completed' AND json_extract(j.value,'$.id')=i.id),0)) AS quantity
    FROM order_items i JOIN orders o ON o.id=i.order_id
    JOIN store_meta m ON m.key='verified-payment:'||o.reference AND m.value='live'
    WHERE i.is_gift=0 AND o.payment_status='paid' AND o.status IN ('paid','processing','shipped','delivered')
      AND datetime(o.paid_at)>=datetime('now','-30 days') AND datetime(o.paid_at)<=datetime('now')
  ) SELECT product_id AS productId,SUM(quantity) AS units30,
    COUNT(DISTINCT CASE WHEN quantity>0 THEN order_id END) AS orders30,
    SUM(CASE WHEN datetime(paid_at)>=datetime('now','-7 days') THEN quantity ELSE 0 END) AS units7,
    COUNT(DISTINCT CASE WHEN quantity>0 AND datetime(paid_at)>=datetime('now','-7 days') THEN order_id END) AS orders7
    FROM net GROUP BY product_id HAVING SUM(quantity)>0 ORDER BY units30 DESC,product_id`).all<SalesSignal>();
  return result.results;
}

export async function releaseStoreReady() {
  const settings=await getCommerceSettings();
  return settings.acceptingOrders && settings.inventoryConfirmed && checkoutSetupIssues(settings,isPaystackConfigured(),configuredShippingFeeKobo()).length===0;
}
export async function releaseAvailable(productId: string) {
  if(!await releaseStoreReady())return false;
  const p=(await listCatalog()).find(product=>product.id===productId);
  return Boolean(p&&!isPreview(p)&&availableUnits(p)>0);
}

type Drop = {id:string;productId:string;startedAt:string;actor:string;completedAt?:string};
export async function announceRelease(productId: string, actor: string) {
  if(!emailReady())throw new Error('Configure the email sender before announcing a release.');
  if(!await releaseAvailable(productId))throw new Error('Open checkout and confirm the published product, price and available stock before announcing it.');
  const db=getDbBinding(),drop:Drop={id:crypto.randomUUID(),productId,startedAt:new Date().toISOString(),actor};
  const result=await db.prepare('INSERT OR IGNORE INTO store_meta (key,value) VALUES (?,?)').bind('release-campaign:'+productId,JSON.stringify(drop)).run();
  return {created:Boolean(result.meta.changes)};
}
export async function releaseCampaigns() {
  const rows=await getDbBinding().prepare("SELECT value FROM store_meta WHERE key LIKE 'release-campaign:%'").all<{value:string}>();
  return rows.results.map(row=>JSON.parse(row.value) as Drop);
}
export async function queueReleaseAlerts() {
  if(!emailReady() || !await releaseStoreReady())return;
  const pending=(await releaseCampaigns()).filter(d=>!d.completedAt);
  if(!pending.length)return; // Do not read the whole catalogue on every idle maintenance run.
  const db=getDbBinding(),products=await listCatalog(),url=runtimeEnv().STOREFRONT_URL||SITE_URL;
  // Small batches leave room for stock checks and delivery on Worker/D1 plans.
  // A scheduled run queues at most 10 recipients in total. Repeated/concurrent runs
  // use the unique outbox event key, so they cannot duplicate a campaign message.
  let remaining=10;
  const availableProducts=new Map(products.filter(p=>!isPreview(p)&&availableUnits(p)>0).map(p=>[p.id,p]));
  for(const drop of pending.filter(d=>availableProducts.has(d.productId)).slice(0,2)) {
    if(!remaining)break;
    const p=availableProducts.get(drop.productId);
    if(!p||isPreview(p)||availableUnits(p)===0)continue;
    const keyProduct=encodeURIComponent(p.id);
    const prefix=`release:${drop.id}:`;
    const rows=await db.prepare(`SELECT s.id,s.email,s.token FROM subscribers s
      WHERE s.status='active' AND (s.kind='newsletter' OR (s.kind='release' AND s.variant_id=?))
      AND datetime(s.updated_at)<=datetime(?)
      AND NOT EXISTS (SELECT 1 FROM subscribers other WHERE other.email=s.email AND other.status='active'
        AND (other.kind='newsletter' OR (other.kind='release' AND other.variant_id=?)) AND datetime(other.updated_at)<=datetime(?) AND other.id<s.id)
      AND NOT EXISTS (SELECT 1 FROM email_outbox e WHERE instr(e.event_key,?)>0 AND e.recipient=s.email)
      ORDER BY s.id LIMIT ?`).bind(p.id,drop.startedAt,p.id,drop.startedAt,`:${prefix}`,remaining).all<{id:string;email:string;token:string}>();
    for(const s of rows.results) {
      await queueEmail(`subscription:${s.id}:${prefix}${keyProduct}:${s.token}`,s.email,`Just released: ${p.name.replace(/^\d+\s+/,'')} · Vanta Noir`,
        `A new Vanta Noir release is ready to explore.\n\n${p.name.replace(/^\d+\s+/,'')}\n${p.description.slice(0,400)}\n\nShop this piece: ${url}/products/${p.slug}\nView the latest price, colours, sizes and delivery details before ordering. Stock is not reserved.\n\nYou confirmed Vanta Noir collection news or an alert for this piece.\nUnsubscribe: ${url}/email-preferences?token=${s.token}\n\nPresence. Power. Precision.`);
    }
    remaining-=rows.results.length;
    if(rows.results.length===0)await db.prepare('UPDATE store_meta SET value=? WHERE key=?').bind(JSON.stringify({...drop,completedAt:new Date().toISOString()}),'release-campaign:'+p.id).run();
  }
}
