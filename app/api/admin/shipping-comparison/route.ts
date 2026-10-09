import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {rateLimit} from '@/lib/commerce-db';
import {comparisonStatus,queueComparison} from '@/lib/shipping-comparison-job';
const headers={'Cache-Control':'no-store'};
async function authorize(request:Request){const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status,headers});if(auth.role!=='owner')return Response.json({error:'Owner access required.'},{status:403,headers});}
export async function GET(request:Request){const denied=await authorize(request);if(denied)return denied;return Response.json(await comparisonStatus(),{headers});}
export async function POST(request:Request){
 const denied=await authorize(request);if(denied)return denied;
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Open owner Settings to run this test.'},{status:403,headers});
 if(!await rateLimit(request,'shipping-comparison',4,3600))return Response.json({error:'Please wait before starting another comparison.'},{status:429,headers});
 return Response.json(await queueComparison(),{status:202,headers});
}
