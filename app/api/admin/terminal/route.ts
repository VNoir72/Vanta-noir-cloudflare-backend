import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {rateLimit} from '@/lib/commerce-db';
import {terminalStatus,queueTerminalTest} from '@/lib/terminal-jobs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){const a=await adminAuthStateFromRequest(request);if(!a.ok)return Response.json({error:a.error},{status:a.status,headers});if(a.role!=='owner')return Response.json({error:'Owner access required.'},{status:403,headers});return Response.json(await terminalStatus(),{headers});}
export async function POST(request:Request){const a=await adminAuthStateFromRequest(request);if(!a.ok)return Response.json({error:a.error},{status:a.status,headers});if(a.role!=='owner'||request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Open owner Settings to test Terminal.'},{status:403,headers});
 if(!await rateLimit(request,'terminal-test',3,3600))return Response.json({error:'Please wait before running more sandbox tests.'},{status:429,headers});
 if(!(await terminalStatus()).configured)return Response.json({error:'Save the Terminal test secret in Cloudflare first.'},{status:503,headers});return Response.json(await queueTerminalTest(),{status:202,headers});}
