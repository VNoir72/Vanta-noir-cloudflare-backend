import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {rateLimit} from '@/lib/commerce-db';
import {liveStatus,queueLiveCheck} from '@/lib/terminal-live';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
async function authorize(request:Request){const a=await adminAuthStateFromRequest(request);if(!a.ok)return Response.json({error:a.error},{status:a.status,headers});if(a.role!=='owner')return Response.json({error:'Owner access required.'},{status:403,headers});}
export async function GET(request:Request){const denied=await authorize(request);if(denied)return denied;return Response.json(await liveStatus(),{headers});}
export async function POST(request:Request){const denied=await authorize(request);if(denied)return denied;if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Open owner Settings to check the connection.'},{status:403,headers});if(!await rateLimit(request,'terminal-live-check',6,3600))return Response.json({error:'Please wait before checking again.'},{status:429,headers});if(!(await liveStatus()).configured)return Response.json({error:'Save the live secret first.'},{status:503,headers});return Response.json(await queueLiveCheck(),{status:202,headers});}
