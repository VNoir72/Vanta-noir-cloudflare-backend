import { z } from 'zod';
import {NIGERIA_STATES} from './commerce-config';
import { SHIPPING_COUNTRIES } from './shipping-countries';

const amount = z.number().int().min(0).max(100_000_000_000).nullable();
export const rewardCampaignSchema = z.object({
  id: z.string().max(80).default(''), version: z.number().int().min(0).default(0),
  title: z.string().trim().min(2).max(100), active: z.boolean().default(false),
  shippingMinimumKobo: amount, giftMinimumKobo: amount,
  giftVariantId: z.string().trim().max(160).default(''),
  countries: z.array(z.string().refine(c => SHIPPING_COUNTRIES.some(([code]) => code === c))).min(1).max(24),
  states: z.array(z.string().refine(s=>NIGERIA_STATES.includes(s),'Choose a Nigerian state.')).max(37).default([]),
  startsAt: z.string().datetime(), endsAt: z.string().datetime(),
  combineDiscounts: z.boolean().default(false),
  access: z.enum(['automatic', 'code']).default('automatic'),
  code: z.string().trim().toUpperCase().max(48).default(''),
  recipientEmail: z.union([z.string().trim().toLowerCase().email().max(200), z.literal('')]).default(''),
  maxUses: z.number().int().min(0).max(1_000_000).default(0),
  priority: z.number().int().min(0).max(100).default(0),
}).superRefine((v, c) => {
  const issue = (message: string) => c.addIssue({ code: 'custom', message });
  if (v.shippingMinimumKobo === null && v.giftMinimumKobo === null) issue('Choose free shipping, a gift, or both.');
  if (v.giftMinimumKobo !== null && !v.giftVariantId) issue('Choose a gift product, colour and size.');
  if (v.endsAt <= v.startsAt) issue('End date must follow start date.');
  if (new Set(v.countries).size !== v.countries.length) issue('Choose each country once.');
  if (v.states.length && (v.countries.length !== 1 || v.countries[0] !== 'NG')) issue('State restrictions require Nigeria as the only eligible country.');
  if (v.access === 'code' && !/^[A-Z0-9_-]{8,48}$/.test(v.code)) issue('Use a reward code of 8–48 letters, numbers, underscores or hyphens.');
  if (v.access === 'automatic' && (v.code || v.recipientEmail)) issue('Private codes and recipient emails require a code-only campaign.');
});
export type RewardCampaign = z.infer<typeof rewardCampaignSchema>;
export type RewardGift = { variantId: string; productId: string; productName: string; color: string; size: string; unitPriceKobo: number; available: number };
export type RewardProgress = { title: string; shippingRemainingKobo: number | null; giftRemainingKobo: number | null; giftName: string | null; giftAvailable: boolean; shippingEligible: boolean; giftEligible: boolean; countries: string[] };
export type RewardQuote = {
  subtotalKobo: number; discountKobo: number; baseShippingKobo: number | null; shippingKobo: number | null; totalKobo: number | null;
  signature: string; progress: RewardProgress | null;
  gift: Pick<RewardGift, 'variantId' | 'productName' | 'color' | 'size'> | null;
  shippingSavingsKobo: number;
};
// Subtotal is the current item price × quantity, before a discount code and excluding delivery/gifts.
export function rewardProgress(c: RewardCampaign, subtotal: number, gift: RewardGift | null): RewardProgress {
  const shippingRemainingKobo = c.shippingMinimumKobo === null ? null : Math.max(0, c.shippingMinimumKobo - subtotal);
  const giftRemainingKobo = c.giftMinimumKobo === null ? null : Math.max(0, c.giftMinimumKobo - subtotal);
  return { title: c.title, countries: c.countries, shippingRemainingKobo, giftRemainingKobo,
    giftName: gift ? `${gift.productName} · ${gift.color} · ${gift.size}` : null,
    giftAvailable: Boolean(gift && gift.available > 0), shippingEligible: shippingRemainingKobo === 0,
    giftEligible: giftRemainingKobo === 0 && Boolean(gift && gift.available > 0) };
}
