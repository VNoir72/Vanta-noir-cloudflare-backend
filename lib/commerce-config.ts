import { z } from "zod";
import { heroSchema, announcementSchema, collectionLabelsSchema, aboutImageSchema } from './storefront-design';
import { SHIPPING_COUNTRIES } from './shipping-countries';

export const NIGERIA_STATES = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];
export const commerceSettingsSchema = z.object({
  hero: heroSchema.default({}),
  announcement: announcementSchema.default({}),
  aboutImage: aboutImageSchema.default({}),
  collectionLabels: collectionLabelsSchema.default([]),
  internationalMode: z.enum(['fixed','live']).default('fixed'),
  internationalEnabled: z.boolean().default(false),
  internationalDutiesNote: z.string().trim().max(600).default(''),
  internationalZones: z.array(z.object({
    countryCode:z.string().refine(v=>v!=='NG'&&SHIPPING_COUNTRIES.some(c=>c[0]===v),'Choose a supported destination.'),
    feeKobo:z.number().int().min(0).max(100000000),
    estimate:z.string().trim().min(3).max(160),
  })).max(100).default([]).refine(zones=>new Set(zones.map(z=>z.countryCode)).size===zones.length,'Each international destination must be unique.'),
  supportEmail: z.union([z.string().trim().email().max(200), z.literal("")]).default(""),
  supportPhone: z.string().trim().max(40).refine(value => !value || /^\+?[\d ()-]+$/.test(value) && value.replace(/\D/g, "").length >= 7, "Enter a valid phone number, including country code.").default(""),
  processingNote: z.string().trim().min(10).max(500).default("Orders are welcome around the clock. Processing begins on the next business day, Monday to Friday, excluding public holidays. Delivery timing is shown separately at checkout."),
  acceptingOrders: z.boolean().default(false),
  inventoryConfirmed: z.boolean().default(false),
  deliveryPolicy: z.string().trim().max(6000).default(""),
  returnPolicy: z.string().trim().max(6000).default(""),
  dispatchNote: z.string().trim().max(240).default(""),
  deliveryNote: z.string().trim().max(500).default(""),
  shippingZones: z.array(z.object({
    state: z.string().refine(value => value === "*" || NIGERIA_STATES.includes(value), "Choose a Nigerian state."),
    feeKobo: z.number().int().min(0).max(10000000).nullable(),
    estimate: z.string().trim().max(160),
  })).max(38).default([]).refine(zones => new Set(zones.map(z => z.state)).size === zones.length, "Each delivery zone must be unique."),
  lowStockThreshold: z.number().int().min(0).max(100).default(3),
}).refine(s=>!s.internationalEnabled||((s.internationalMode==='live'||s.internationalZones.length>0)&&s.internationalDutiesNote.length>=10), 'Add international rates or select automatic courier rates, and explain customs / import charges.');
export type CommerceSettings = z.infer<typeof commerceSettingsSchema>;
export function defaultCommerceSettings() { return commerceSettingsSchema.parse({}); }
export function checkoutSetupIssues(settings: CommerceSettings, paymentsEnabled: boolean, shippingFeeKobo: number | null = null, liveCourierRates = false) {
  const issues: string[] = [];
  if (!paymentsEnabled) issues.push("Connect Paystack");
  if (!settings.supportEmail) issues.push("Add your customer care email");
  if (!settings.dispatchNote) issues.push("Confirm dispatch timing");
  if (!liveCourierRates && !settings.shippingZones.length && (shippingFeeKobo === null || !settings.deliveryNote)) issues.push("Set delivery rates and estimates");
  if (!liveCourierRates && settings.shippingZones.length && !settings.shippingZones.some(deliveryZoneReady)) issues.push("Complete at least one delivery zone fee and estimate");
  if (!settings.returnPolicy) issues.push("Publish your returns and exchange policy");
  if (!settings.inventoryConfirmed) issues.push("Confirm product prices and actual stock");
  return issues;
}
export function deliveryZoneReady(zone:CommerceSettings['shippingZones'][number]) { return zone.feeKobo!==null && zone.estimate.trim().length>=3; }
export function publicCommerceSettings(settings:CommerceSettings,liveCourierRates=false):CommerceSettings {
  const shippingZones=settings.shippingZones.filter(deliveryZoneReady);
  const publicSettings={...settings,shippingZones,acceptingOrders:settings.acceptingOrders&&(liveCourierRates||!settings.shippingZones.length||shippingZones.length>0)};
  return settings.internationalEnabled?publicSettings:{...publicSettings,internationalZones:[],internationalDutiesNote:''};
}
export function shippingQuote(settings: Partial<CommerceSettings> & { shippingFeeKobo?: number | null }, state: string, countryCode='NG') {
  if(countryCode!=='NG') {
    const zone=settings.internationalEnabled?settings.internationalZones?.find(z=>z.countryCode===countryCode):undefined;
    return {feeKobo:zone?.feeKobo??null,estimate:zone?.estimate??'',dispatchNote:settings.dispatchNote??'',supported:Boolean(zone)};
  }
  const zones = settings.shippingZones ?? [];
  const normalized = state.trim().toLowerCase();
  const zone = zones.find(z => z.state.toLowerCase() === normalized) ?? zones.find(z => z.state === "*");
  if (zone && !deliveryZoneReady(zone)) return {feeKobo:null,estimate:"",dispatchNote:settings.dispatchNote??"",supported:false};
  const feeKobo = zones.length ? (normalized ? zone?.feeKobo ?? null : null) : settings.shippingFeeKobo ?? null;
  return { feeKobo, estimate: zone?.estimate ?? settings.deliveryNote ?? "", dispatchNote: settings.dispatchNote ?? "", supported: !zones.length || !normalized || Boolean(zone) };
}
