import {z} from 'zod';
import {checkoutCustomerSchema} from './checkout-address';
import {getDbBinding,runtimeEnv} from './runtime-env';
import {getPickupDetails} from './terminal-pickup';
import {productParcel,packagingProfiles} from './parcel-profiles';
import {prepareParcel} from './parcel-estimates';
import {quoteRewards} from './rewards-db';
import {quotePromotion} from './operations';
import {shipbubbleQuote,type ComparisonRate} from './shipping-comparison';
import {assertShippingProvider} from './shipping-policy';
export const shippingInputSchema=z.object({
 customer:checkoutCustomerSchema,
 cart:z.array(z.object({variantId:z.string().min(3).max(120),quantity:z.number().int().min(1).max(5)})).min(1).max(20).refine(c=>new Set(c.map(i=>i.variantId)).size===c.length),
 rewardCode:z.string().trim().toUpperCase().max(48).default(''),promotionCode:z.string().trim().toUpperCase().max(32).default(''),
});
export const shippingSelectionSchema=z.object({quoteId:z.string().uuid(),rateId:z.string().uuid(),provider:z.literal('shipbubble')});
type Input=z.infer<typeof shippingInputSchema>;
export type ShippingSelection=z.infer<typeof shippingSelectionSchema>;
type QuoteRecord={inputHash:string;expiresAt:number;giftVariantId:string;rates:Array<ComparisonRate&{selectionId:string}>;parcel:object};
export class ShippingInputError extends Error{}
const invalid=()=>new ShippingInputError('Delivery options changed or expired. Check delivery again before paying.');
async function fingerprint(input:Input){const canonical={...input,cart:[...input.cart].sort((a,b)=>a.variantId.localeCompare(b.variantId))};const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical)));return Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');}
async function parcelFor(input:Input){
 const db=getDbBinding();
 const rows=await db.prepare(`SELECT v.id AS variantId,v.product_id AS productId,v.size,p.name,p.price_kobo AS price FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id IN (${input.cart.map(()=>'?').join(',')}) AND v.active=1 AND p.active=1 AND p.status='published' AND p.price_kobo>0`).bind(...input.cart.map(i=>i.variantId)).all<{variantId:string;productId:string;size:string;name:string;price:number}>();
 const items=input.cart.map(i=>{const r=rows.results.find(r=>r.variantId===i.variantId);if(!r)throw new ShippingInputError('An item is unavailable. Refresh your bag.');return {...r,quantity:i.quantity,lineTotalKobo:r.price*i.quantity};});
 const subtotal=items.reduce((n,i)=>n+i.lineTotalKobo,0);
 const {discountKobo,promotion}=await quotePromotion(input.promotionCode,items);
 const rewards=await quoteRewards({subtotalKobo:subtotal,discountKobo,hasDiscount:Boolean(promotion),countryCode:input.customer.countryCode,email:input.customer.email,code:input.rewardCode,shippingKobo:0,cart:input.cart});
 if(rewards.gift){const g=rewards.gift;items.push({variantId:g.variantId,productId:g.productId,size:g.size,name:g.productName,price:g.unitPriceKobo,quantity:1,lineTotalKobo:g.unitPriceKobo});}
 const profiles=await Promise.all(items.map(async i=>({...i,parcel:(await productParcel(i.productId,i.size)).parcel})));
 const packaging=await packagingProfiles();const prepared=prepareParcel(profiles,packaging.data);
 if(!prepared.suggestion||prepared.suggestion.estimated)throw new ShippingInputError('Delivery pricing for these items is being prepared. Please contact customer care.');
 return {parcel:{...prepared.suggestion,valueNaira:items.reduce((n,i)=>n+i.lineTotalKobo,0)/100},giftVariantId:rewards.gift?.variantId||''};
}
export async function createShippingQuotes(raw:unknown){
 const input=shippingInputSchema.parse(raw);
 if(input.customer.countryCode!=='NG')throw new ShippingInputError('Shipbubble delivery is currently available within Nigeria.');
 const key=runtimeEnv().SHIPBUBBLE_API_KEY||'';if(!key.startsWith('sb_prod_'))throw new ShippingInputError('Delivery pricing is temporarily unavailable. Please contact customer care.');
 const pickup=await getPickupDetails();if(!pickup)throw new ShippingInputError('Delivery pickup details are not ready. Please contact customer care.');
 const {parcel,giftVariantId}=await parcelFor(input),c=input.customer;
 const rates=await shipbubbleQuote(key,{...pickup.details,line1:[pickup.details.line1,pickup.details.line2].filter(Boolean).join(', ')},{first_name:c.firstName,last_name:c.lastName,email:c.email,phone:c.phone,line1:[c.addressLine1,c.addressLine2].filter(Boolean).join(', '),city:c.city,state:c.state,country:'NG',zip:c.postalCode},parcel,'live');
 if(!rates.length)throw new ShippingInputError('No pickup delivery service is available for this address. Please contact customer care.');
 const quoteId=crypto.randomUUID(),record:QuoteRecord={inputHash:await fingerprint(input),expiresAt:Date.now()+15*60_000,giftVariantId,parcel,rates:rates.sort((a,b)=>a.amountKobo-b.amountKobo).map(r=>({...r,selectionId:crypto.randomUUID()}))};
 const db=getDbBinding();
 await db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?)').bind('shipping-quote:'+quoteId,JSON.stringify(record)).run();
 // Quote records contain hashes, parcel data and provider references, not customer contact details.
 await db.prepare("DELETE FROM store_meta WHERE key LIKE 'shipping-quote:%' AND json_extract(value,'$.expiresAt')<?").bind(Date.now()-86400000).run();
 return {quoteId,expiresAt:record.expiresAt,rates:record.rates.map(r=>({rateId:r.selectionId,provider:r.provider,carrier:r.carrier,amountKobo:r.amountKobo,delivery:r.delivery}))};
}
export async function resolveShippingSelection(selection:ShippingSelection,inputRaw:unknown,allowExpiredForExistingAttempt=false){
 assertShippingProvider(selection.provider);
 const input=shippingInputSchema.parse(inputRaw);
 const row=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind('shipping-quote:'+selection.quoteId).first<{value:string}>();
 if(!row)throw invalid();const record=JSON.parse(row.value) as QuoteRecord;
 if((record.expiresAt<=Date.now()&&!allowExpiredForExistingAttempt)||record.inputHash!==await fingerprint(input))throw invalid();
 const rate=record.rates.find(r=>r.selectionId===selection.rateId);if(!rate)throw invalid();assertShippingProvider(rate.provider);
 return {selection,rate,parcel:record.parcel,giftVariantId:record.giftVariantId,expiresAt:record.expiresAt};
}
