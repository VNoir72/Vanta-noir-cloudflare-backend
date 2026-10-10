import {interestSchema,saveInterest} from '@/lib/product-demand';
import {rateLimit} from '@/lib/rate-limit';
export async function POST(request:Request){
 if(!await rateLimit(request,'product-interest',120,600))return Response.json({error:'Please wait a moment before saving more designs.'},{status:429});
 const input=interestSchema.safeParse(await request.json().catch(()=>null));
 if(!input.success)return Response.json({error:'Select a valid design, colour and size.'},{status:400});
 try{await saveInterest(input.data);return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});}
 catch(e){return Response.json({error:e instanceof Error&&e.message.startsWith('This design')?e.message:'Could not save your preference. Please try again.'},{status:400});}
}
