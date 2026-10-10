import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {productDemand} from '@/lib/product-demand';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await adminAuthStateFromRequest(request);
 if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 return Response.json({products:await productDemand(),generatedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
}
