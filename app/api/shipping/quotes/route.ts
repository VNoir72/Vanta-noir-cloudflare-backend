import {getDbBinding} from '@/lib/runtime-env';
import {ShippingProviderError} from '@/lib/shipping-comparison';
import {appAccessContext} from '@/lib/app-attestation';
import {z} from 'zod';
import {rateLimit} from '@/lib/commerce-db';
import {createShippingQuotes,ShippingInputError} from '@/lib/shipping-checkout';
export async function POST(request:Request){
 if(!await rateLimit(request,'shipping-quotes',12,600))return Response.json({error:'Please wait before checking delivery again.'},{status:429});
 try{const raw=await request.text();if(raw.length>16000)return Response.json({error:'Delivery request is too large.'},{status:413});
 return Response.json(await createShippingQuotes(JSON.parse(raw),await appAccessContext(request)),{headers:{'Cache-Control':'no-store'}});
 }catch(e){
 const message=e instanceof Error?e.message:'';
 const providerFailure=e instanceof ShippingProviderError;
 const funding=providerFailure&&e.fields.some(f=>['wallet','balance','credit'].includes(f));
 if(providerFailure)await getDbBinding().prepare("INSERT INTO store_meta(key,value) VALUES('shipbubble-checkout-issue',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify({kind:funding?'funding':'provider',checkedAt:new Date().toISOString(),status:e.status,stage:e.stage})).run().catch(()=>{});
 const safeReason=e instanceof z.ZodError?'invalid_address_or_cart':e instanceof ShippingInputError?'checkout_input':/^Shipping provider HTTP [1-5][0-9]{2}\.$/.test(message)?message:['Shipping provider timed out or could not be reached.','Shipbubble did not validate both addresses.','Shipbubble clothing category is unavailable.','Shipping provider rejected the request.','The courier could not verify this destination.'].includes(message)?message:'unverified_provider_response';
 console.warn(JSON.stringify({event:'shipping_quote_failed',reason:safeReason}));
 return Response.json({error:e instanceof z.ZodError?'Complete your contact and delivery details first.':e instanceof ShippingInputError?e.message:'Delivery pricing is temporarily unavailable. Your bag and address are kept. Please retry shortly or contact support before paying.'},{status:e instanceof z.ZodError||e instanceof ShippingInputError?400:503,headers:{'Cache-Control':'no-store','Retry-After':'60'}});}
}
