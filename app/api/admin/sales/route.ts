import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {canSell,salesData,submitSale,SaleInputError} from '@/lib/walk-in-sales';
import {z} from 'zod';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 if(!canSell(auth.role))return Response.json({error:'Sales access denied.'},{status:403});
 try{return Response.json(await salesData(auth,new URL(request.url).searchParams),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Sales desk could not load. Refresh to try again.'},{status:503});}
}
export async function POST(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 if(!canSell(auth.role))return Response.json({error:'Sales access denied.'},{status:403});
 const raw=await request.text();if(raw.length>20000)return Response.json({error:'Sale is too large.'},{status:413});
 try{return Response.json(await submitSale(auth,JSON.parse(raw)),{status:202,headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:e instanceof z.ZodError?e.issues[0]?.message:e instanceof SaleInputError?e.message:'Could not confirm submission. Retry the same sale.'},{status:e instanceof z.ZodError?400:e instanceof SaleInputError?409:503});}
}
