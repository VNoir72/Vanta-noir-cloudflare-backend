import {z} from 'zod';
import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {rateLimit} from '@/lib/commerce-db';
import {DeliveryError,quoteDelivery,bookDelivery,refreshDeliveryTracking,recentDeliverySessions,deliverySession} from '@/lib/terminal-delivery';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status,headers});if(auth.role!=='owner')return Response.json({error:'Owner access required.'},{status:403,headers});try{const p=new URL(request.url).searchParams;const id=p.get('id');return Response.json({mode:'sandbox',session:id?await deliverySession(id):null,sessions:id?[]:await recentDeliverySessions(p.get('reference')||undefined)},{headers});}catch{return Response.json({error:'Sandbox delivery records could not be loaded.'},{status:400,headers});}}
export async function POST(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status,headers});if(auth.role!=='owner'||request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Open this test from owner Settings.'},{status:403,headers});
 if(!await rateLimit(request,'terminal-shipping',20,3600))return Response.json({error:'Sandbox request limit reached. Wait before retrying.'},{status:429,headers});
 const text=await request.text();if(text.length>12000)return Response.json({error:'Request is too large.'},{status:413,headers});let body:any;try{body=JSON.parse(text);}catch{return Response.json({error:'Invalid request.'},{status:400,headers});}
 try{let session;if(body.action==='quote')session=await quoteDelivery(body.input);else if(body.action==='book'){const p=z.object({id:z.string().max(140),rateId:z.string().max(120),expectedKobo:z.number().int().positive(),confirmed:z.literal(true)}).parse(body);session=await bookDelivery(p.id,p.rateId,p.expectedKobo,p.confirmed);}else if(body.action==='track')session=await refreshDeliveryTracking(z.string().max(140).parse(body.id));else throw new DeliveryError('Unknown sandbox action.');return Response.json({mode:'sandbox',session},{headers});}
 catch(e){return Response.json({error:e instanceof z.ZodError?'Check the address, six-digit postcode, parcel measurements and confirmation.':e instanceof DeliveryError?e.message:'Sandbox request failed. Refresh the saved test before retrying.'},{status:400,headers});}
}
