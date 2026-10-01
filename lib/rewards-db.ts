import { z } from 'zod';
import { getDbBinding } from './runtime-env';
import { rewardCampaignSchema, rewardProgress, type RewardCampaign, type RewardGift, type RewardQuote } from './rewards';

export const rewardUseCountSql = `(SELECT COUNT(*) FROM order_rewards r JOIN orders o ON o.id=r.order_id WHERE r.campaign_id=c.id AND (o.payment_status='paid' OR (o.status='pending_payment' AND o.created_at>datetime('now','-15 minutes'))))`;
export const rewardCapacitySql = `(json_extract(c.config_json,'$.maxUses')=0 OR json_extract(c.config_json,'$.maxUses')>${rewardUseCountSql})`;
export async function rewardGift(variantId: string, cart: Array<{ variantId: string; quantity: number }> = []): Promise<RewardGift | null> {
  if (!variantId) return null;
  const row = await getDbBinding().prepare(`SELECT v.id AS variantId,p.id AS productId,p.name AS productName,v.color,v.size,p.price_kobo AS unitPriceKobo,
    v.stock-COALESCE((SELECT SUM(quantity) FROM stock_reservations WHERE variant_id=v.id AND expires_at>CURRENT_TIMESTAMP),0) AS available
    FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id=? AND v.active=1 AND p.active=1 AND p.status='published' AND p.price_kobo>0 AND v.size<>'Size pending'
    AND COALESCE(json_extract(p.details_json,'$.availability'),'in_stock')='in_stock'
    AND COALESCE(json_extract(p.details_json,'$.priceStatus'),'approved')='approved'`).bind(variantId).first<RewardGift>();
  return row ? { ...row, available: Math.max(0, row.available - cart.filter(i => i.variantId === variantId).reduce((s, i) => s + i.quantity, 0)) } : null;
}
export async function saveRewardCampaign(input: unknown, actor: string) {
  const v = rewardCampaignSchema.parse(input), db = getDbBinding();
  if (v.active && v.giftMinimumKobo !== null && !await rewardGift(v.giftVariantId)) throw new Error('Choose a published, approved gift variant.');
  const id = v.id || crypto.randomUUID(), next = { ...v, id, version: v.version + 1 };
  if (v.access === 'code' && await db.prepare('SELECT id FROM reward_campaigns WHERE code=? AND id<>?').bind(v.code,id).first()) throw new Error('That reward code is already used. Generate another code.');
  const r = await db.prepare(`INSERT INTO reward_campaigns(id,config_json,code,version,active,starts_at,ends_at) SELECT ?,?,?,1,?,?,? WHERE ?=0 OR EXISTS(SELECT 1 FROM reward_campaigns WHERE id=? AND version=?)
    ON CONFLICT(id) DO UPDATE SET config_json=excluded.config_json,code=excluded.code,version=reward_campaigns.version+1,active=excluded.active,starts_at=excluded.starts_at,ends_at=excluded.ends_at WHERE reward_campaigns.version=?`)
    .bind(id, JSON.stringify(next), v.access === 'code' ? v.code : null, v.active ? 1 : 0, v.startsAt, v.endsAt, v.version,id,v.version,v.version).run();
  if (!r.meta.changes) throw new Error('This reward changed. Refresh before saving again.');
  await db.prepare('INSERT INTO admin_audit(actor,action,entity) VALUES(?,?,?)').bind(actor, 'reward saved', id).run();
  return next;
}
export async function rewardAdminData() {
  const db = getDbBinding();
  const campaigns = await db.prepare(`SELECT c.config_json,c.version,(SELECT COUNT(*) FROM order_rewards r JOIN orders o ON o.id=r.order_id WHERE r.campaign_id=c.id AND o.payment_status='paid') AS redeemed FROM reward_campaigns c ORDER BY rowid DESC LIMIT 300`).all<{ config_json: string; version: number; redeemed: number }>();
  const gifts = await db.prepare(`SELECT v.id,p.name,v.color,v.size,v.stock-COALESCE((SELECT SUM(quantity) FROM stock_reservations WHERE variant_id=v.id AND expires_at>CURRENT_TIMESTAMP),0) AS available
    FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.active=1 AND p.active=1 AND p.status='published' AND p.price_kobo>0 AND v.size<>'Size pending'
    AND COALESCE(json_extract(p.details_json,'$.availability'),'in_stock')='in_stock' AND COALESCE(json_extract(p.details_json,'$.priceStatus'),'approved')='approved' ORDER BY p.name,v.color,v.size`).all();
  return { campaigns: campaigns.results.map(r => ({ ...JSON.parse(r.config_json), version: r.version, redeemed: r.redeemed })), giftVariants: gifts.results };
}
export function randomRewardCode() { return 'VN-' + crypto.randomUUID().replaceAll('-', '').slice(0, 24).toUpperCase(); }
export async function drawRewardWinners(input: unknown, actor: string) {
  const v = z.object({ templateId: z.string().min(1).max(80), emails: z.array(z.string().trim().toLowerCase().email().max(200)).min(1).max(500), count: z.number().int().min(1).max(25), drawId: z.string().uuid() }).parse(input);
  const db = getDbBinding(), key = `reward-draw:${v.drawId}`;
  const existing = await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();
  if (existing) return JSON.parse(existing.value);
  const row = await db.prepare('SELECT config_json FROM reward_campaigns WHERE id=?').bind(v.templateId).first<{config_json:string}>();
  if (!row) throw new Error('Save a reward campaign first, then choose it as the template.');
  const template = rewardCampaignSchema.parse(JSON.parse(row.config_json));
  if (template.endsAt <= new Date().toISOString()) throw new Error('This template has expired. Update its dates before drawing winners.');
  const emails = [...new Set(v.emails)];
  if (v.count > emails.length) throw new Error('Winner count exceeds the number of unique eligible emails.');
  for (let i = emails.length - 1; i > 0; i--) {
    const limit = Math.floor(0x100000000 / (i + 1)) * (i + 1); let n: number;
    do { n = crypto.getRandomValues(new Uint32Array(1))[0]; } while (n >= limit);
    const j = n % (i + 1); [emails[i], emails[j]] = [emails[j], emails[i]];
  }
  const winners = emails.slice(0, v.count).map(email => ({ ...template, id: crypto.randomUUID(), version: 1, active: false, access: 'code' as const, recipientEmail: email, code: randomRewardCode(), maxUses: 1 }));
  const token=crypto.randomUUID();
  const result = { drawId: v.drawId, winners: winners.map(w => ({ email: w.recipientEmail, code: w.code, id: w.id })), active: false };
  const statements = [db.prepare('INSERT OR IGNORE INTO store_meta(key,value) VALUES(?,?)').bind(key, JSON.stringify({...result,token})),
    ...winners.map(w => db.prepare(`INSERT INTO reward_campaigns(id,config_json,code,version,active,starts_at,ends_at) SELECT ?,?,?,1,0,?,? WHERE EXISTS(SELECT 1 FROM store_meta WHERE key=? AND json_extract(value,'$.token')=?)`).bind(w.id, JSON.stringify(w), w.code, w.startsAt, w.endsAt, key, token)),
    db.prepare(`INSERT INTO admin_audit(actor,action,entity,detail) SELECT ?,'reward draw',?,? WHERE EXISTS(SELECT 1 FROM store_meta WHERE key=? AND json_extract(value,'$.token')=?)`).bind(actor,v.drawId,JSON.stringify({templateId:v.templateId,candidateCount:emails.length,winners:result.winners}),key,token)];
  await db.batch(statements);
  const saved = await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();
  return JSON.parse(saved!.value);
}
export async function quoteRewards(input: { subtotalKobo: number; discountKobo: number; hasDiscount: boolean; countryCode: string; email?: string; code?: string; shippingKobo: number | null; cart: Array<{variantId:string;quantity:number}> }) {
  const db = getDbBinding(), now = new Date().toISOString(), code = (input.code || '').trim().toUpperCase();
  const rows = await db.prepare(`SELECT c.config_json,c.version FROM reward_campaigns c WHERE c.active=1 AND c.starts_at<=? AND c.ends_at>? AND ${rewardCapacitySql} AND (c.code IS NULL OR c.code=?) ORDER BY CAST(json_extract(c.config_json,'$.priority') AS INTEGER) DESC,c.id`).bind(now, now, code).all<{config_json:string;version:number}>();
  const campaigns = rows.results.map(r => ({ ...rewardCampaignSchema.parse(JSON.parse(r.config_json)), version: r.version }));
  // A private code explicitly chooses its campaign; do not silently substitute an automatic reward.
  const candidates = campaigns.filter(c => code ? c.access === 'code' && c.code === code : c.access === 'automatic');
  const eligible = candidates.filter(c => c.countries.includes(input.countryCode) && (!input.hasDiscount || c.combineDiscounts) && (!c.recipientEmail || c.recipientEmail === (input.email || '').trim().toLowerCase()));
  if (code && !eligible.length) throw new Error('This reward code is unavailable for these checkout details. Check its dates, email, country and discount conditions.');
  let campaign: RewardCampaign | null = null, gift: RewardGift | null = null, progress: ReturnType<typeof rewardProgress> | null = null;
  for (const c of eligible) {
    const g = c.giftMinimumKobo === null ? null : await rewardGift(c.giftVariantId, input.cart), p = rewardProgress(c, input.subtotalKobo, g);
    if (!campaign) { campaign = c; gift = g; progress = p; }
    if (p.shippingEligible || p.giftEligible) { campaign = c; gift = g; progress = p; break; }
  }
  const shippingSavingsKobo = progress?.shippingEligible && input.shippingKobo !== null ? input.shippingKobo : 0;
  const chosenGift = progress?.giftEligible ? gift : null;
  const applied = Boolean(shippingSavingsKobo > 0 || chosenGift);
  const signature = applied && campaign ? `${campaign.id}:${campaign.version}:${shippingSavingsKobo}:${chosenGift?.variantId || ''}` : '';
  const shippingKobo = input.shippingKobo === null ? null : input.shippingKobo - shippingSavingsKobo;
  const quote: RewardQuote = { subtotalKobo: input.subtotalKobo, discountKobo: input.discountKobo, baseShippingKobo: input.shippingKobo, shippingKobo,
    totalKobo: shippingKobo === null ? null : input.subtotalKobo - input.discountKobo + shippingKobo,
    signature, progress, shippingSavingsKobo,
    gift: chosenGift ? {variantId:chosenGift.variantId,productName:chosenGift.productName,color:chosenGift.color,size:chosenGift.size} : null };
  return { quote, campaign: applied ? campaign : null, gift: chosenGift };
}
