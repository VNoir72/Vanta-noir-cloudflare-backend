import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {checkShipbubbleLive,shipbubbleReadiness} from '@/lib/shipbubble-live';
import {rateLimit} from '@/lib/rate-limit';
export async function GET(request:Request){
 const a=await adminAuthStateFromRequest(request);if(!a.ok)return Response.json({error:a.error},{status:a.status});
 if(a.role!=='owner')return Response.json({error:'Owner access required.'},{status:403});
 return Response.json(await shipbubbleReadiness(),{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
 const a=await adminAuthStateFromRequest(request);if(!a.ok)return Response.json({error:a.error},{status:a.status});
 if(a.role!=='owner'||request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Owner access required.'},{status:403});
 if(!await rateLimit(request,'shipping-health',6,600))return Response.json({error:'Please wait before checking again.'},{status:429});
 return Response.json(await checkShipbubbleLive(),{headers:{'Cache-Control':'no-store'}});
}
