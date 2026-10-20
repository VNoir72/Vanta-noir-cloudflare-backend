import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {adminSecurityAction,adminSecurityOverview} from '@/lib/admin-sign-in';
import {rateLimit} from '@/lib/rate-limit';
import {adminSecurityHtml,adminSecurityScript} from '@/lib/admin-sign-in-page';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'};
async function owner(request:Request){const a=await adminAuthStateFromRequest(request);return a.ok&&a.role==='owner'?a:Response.json({error:'Owner access required.'},{status:403,headers});}
export async function GET(request:Request){const a=await owner(request);if(a instanceof Response)return a;const q=new URL(request.url).searchParams;if(q.get('asset')==='js')return new Response(adminSecurityScript,{headers:{...headers,'Content-Type':'application/javascript; charset=utf-8'}});if(q.get('format')==='json')return Response.json(await adminSecurityOverview(request,a.email),{headers});return new Response(adminSecurityHtml,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"}});}
export async function POST(request:Request){const a=await owner(request);if(a instanceof Response)return a;if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Open Sign-in security in Store admin.'},{status:403,headers});if(!await rateLimit(request,'admin-security',30,600))return Response.json({error:'Please wait before changing browser trust again.'},{status:429,headers});try{return Response.json(await adminSecurityAction(await request.json(),a.email),{headers});}catch(e){return Response.json({error:e instanceof Error?e.message:'Could not update browser trust.'},{status:400,headers});}}

