import {z} from 'zod';
import {rateLimit} from '@/lib/commerce-db';
import {createShippingQuotes,ShippingInputError} from '@/lib/shipping-checkout';
export async function POST(request:Request){
 if(!await rateLimit(request,'shipping-quotes',12,600))return Response.json({error:'Please wait before checking delivery again.'},{status:429});
 try{const raw=await request.text();if(raw.length>16000)return Response.json({error:'Delivery request is too large.'},{status:413});
 return Response.json(await createShippingQuotes(JSON.parse(raw)),{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof z.ZodError?'Complete your contact and delivery details first.':e instanceof ShippingInputError?e.message:'Delivery prices could not be retrieved. Please try again shortly.'},{status:400,headers:{'Cache-Control':'no-store'}});}
}
