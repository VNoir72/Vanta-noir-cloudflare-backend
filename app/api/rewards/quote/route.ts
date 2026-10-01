import {z} from 'zod';
import {getDbBinding,configuredShippingFeeKobo} from '@/lib/runtime-env';
import {getCommerceSettings,rateLimit} from '@/lib/commerce-db';
import {shippingQuote} from '@/lib/commerce-config';
import {SHIPPING_COUNTRIES} from '@/lib/shipping-countries';
import {quotePromotion} from '@/lib/operations';
import {quoteRewards} from '@/lib/rewards-db';
const schema=z.object({
  cart:z.array(z.object({variantId:z.string().min(3).max(120),quantity:z.number().int().min(1).max(5)})).min(1).max(20).refine(c=>new Set(c.map(i=>i.variantId)).size===c.length),
  countryCode:z.string().refine(c=>SHIPPING_COUNTRIES.some(([code])=>code===c)).default('NG'),state:z.string().max(100).default(''),
  email:z.union([z.string().trim().toLowerCase().email().max(200),z.literal('')]).default(''),
  code:z.string().trim().toUpperCase().max(48).default(''),discountCode:z.string().trim().toUpperCase().max(32).default(''),
});
export async function POST(request:Request){
  if(!await rateLimit(request,'rewards',120,600))return Response.json({error:'Please wait before checking more rewards.'},{status:429});
  try{
    const raw=await request.text();if(raw.length>12000)throw new Error('Your bag is too large.');
    const v=schema.parse(JSON.parse(raw)),db=getDbBinding();
    const rows=await db.prepare(`SELECT v.id AS variantId,p.id AS productId,p.price_kobo AS price,
      v.stock-COALESCE((SELECT SUM(quantity) FROM stock_reservations WHERE variant_id=v.id AND expires_at>CURRENT_TIMESTAMP),0) AS available
      FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id IN (${v.cart.map(()=>'?').join(',')})
      AND v.active=1 AND p.active=1 AND p.status='published' AND p.price_kobo>0 AND v.size<>'Size pending'
      AND COALESCE(json_extract(p.details_json,'$.availability'),'in_stock')='in_stock'
      AND COALESCE(json_extract(p.details_json,'$.priceStatus'),'approved')='approved'`).bind(...v.cart.map(i=>i.variantId)).all<{variantId:string;productId:string;price:number;available:number}>();
    const items=v.cart.map(i=>{const r=rows.results.find(r=>r.variantId===i.variantId);if(!r||r.available<i.quantity)throw new Error('An item is unavailable. Please refresh your bag.');return {productId:r.productId,quantity:i.quantity,lineTotalKobo:r.price*i.quantity};});
    const {discountKobo,promotion}=await quotePromotion(v.discountCode,items);
    const settings=await getCommerceSettings(),delivery=shippingQuote({...settings,shippingFeeKobo:configuredShippingFeeKobo()},v.state,v.countryCode);
    const {quote}=await quoteRewards({subtotalKobo:items.reduce((n,i)=>n+i.lineTotalKobo,0),discountKobo,hasDiscount:Boolean(promotion),countryCode:v.countryCode,email:v.email,code:v.code,shippingKobo:delivery.feeKobo,cart:v.cart});
    return Response.json(quote,{headers:{'Cache-Control':'no-store'}});
  }catch(e){return Response.json({error:e instanceof z.ZodError?'Check your bag, country and email.':e instanceof Error?e.message:'Rewards could not be checked.'},{status:400});}
}
