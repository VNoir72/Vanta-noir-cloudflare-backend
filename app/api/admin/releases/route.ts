import { z } from 'zod';
import { adminAuthStateFromRequest } from '@/lib/admin-auth';
import { announceRelease, releaseCampaigns, salesSignals } from '@/lib/merchandising-db';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  const auth=await adminAuthStateFromRequest(request);
  if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
  if(auth.role!=='owner')return Response.json({error:'Only the owner can manage release announcements.'},{status:403});
  return Response.json({campaigns:await releaseCampaigns(),sales:await salesSignals()},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request) {
  const auth=await adminAuthStateFromRequest(request);
  if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
  if(auth.role!=='owner')return Response.json({error:'Only the owner can announce releases.'},{status:403});
  const input=z.object({productId:z.string().trim().min(1).max(160),confirmed:z.literal(true)}).safeParse(await request.json().catch(()=>null));
  if(!input.success)return Response.json({error:'Select a product and confirm the announcement.'},{status:400});
  try{return Response.json(await announceRelease(input.data.productId,auth.email));}
  catch(error){return Response.json({error:error instanceof Error?error.message:'Could not announce this release.'},{status:400});}
}
