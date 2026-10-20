import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {registerAdminBrowser} from '@/lib/admin-sign-in';
export const dynamic='force-dynamic';
export async function POST(request:Request){const a=await adminAuthStateFromRequest(request);if(!a.ok)return Response.json({error:a.error},{status:a.status});if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Open Store admin to register this browser.'},{status:403});try{const cookie=await registerAdminBrowser(request,a.email,a.role);return Response.json({registered:true},{headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});}catch{return Response.json({error:'Browser registration unavailable.'},{status:503});}}

