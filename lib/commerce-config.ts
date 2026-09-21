import { z } from "zod";

export const NIGERIA_STATES = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];
export const commerceSettingsSchema = z.object({
  supportEmail: z.union([z.string().trim().email().max(200), z.literal("")]).default(""),
  acceptingOrders: z.boolean().default(false),
  inventoryConfirmed: z.boolean().default(false),
  returnPolicy: z.string().trim().max(6000).default(""),
  dispatchNote: z.string().trim().max(240).default(""),
  deliveryNote: z.string().trim().max(500).default(""),
  shippingZones: z.array(z.object({
    state: z.string().refine(value => value === "*" || NIGERIA_STATES.includes(value), "Choose a Nigerian state."),
    feeKobo: z.number().int().min(0).max(10000000),
    estimate: z.string().trim().min(3).max(160),
  })).max(38).default([]).refine(zones => new Set(zones.map(z => z.state)).size === zones.length, "Each delivery zone must be unique."),
  lowStockThreshold: z.number().int().min(0).max(100).default(3),
});
export type CommerceSettings = z.infer<typeof commerceSettingsSchema>;
export function defaultCommerceSettings() { return commerceSettingsSchema.parse({}); }
export function checkoutSetupIssues(settings: CommerceSettings, paymentsEnabled: boolean, shippingFeeKobo: number | null = null) {
  const issues: string[] = [];
  if (!paymentsEnabled) issues.push("Connect Paystack");
  if (!settings.supportEmail) issues.push("Add your customer care email");
  if (!settings.dispatchNote) issues.push("Confirm dispatch timing");
  if (!settings.shippingZones.length && (shippingFeeKobo === null || !settings.deliveryNote)) issues.push("Set delivery rates and estimates");
  if (!settings.returnPolicy) issues.push("Publish your returns and exchange policy");
  if (!settings.inventoryConfirmed) issues.push("Confirm product prices and actual stock");
  return issues;
}
export function shippingQuote(settings: { shippingZones?: CommerceSettings["shippingZones"]; shippingFeeKobo?: number | null; deliveryNote?: string; dispatchNote?: string }, state: string) {
  const zones = settings.shippingZones ?? [];
  const normalized = state.trim().toLowerCase();
  const zone = zones.find(z => z.state.toLowerCase() === normalized) ?? zones.find(z => z.state === "*");
  const feeKobo = zones.length ? (normalized ? zone?.feeKobo ?? null : null) : settings.shippingFeeKobo ?? null;
  return { feeKobo, estimate: zone?.estimate ?? settings.deliveryNote ?? "", dispatchNote: settings.dispatchNote ?? "", supported: !zones.length || !normalized || Boolean(zone) };
}
