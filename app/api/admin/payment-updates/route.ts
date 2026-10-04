import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {recentPaymentUpdates} from '@/lib/payment-events';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await adminAuthStateFromRequest(request);
 if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 if(auth.role!=='owner')return Response.json({error:'Owner access required.'},{status:403});
 return Response.json({updates:await recentPaymentUpdates()},{headers:{'Cache-Control':'no-store'}});
}
