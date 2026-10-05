import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {rateLimit} from '@/lib/commerce-db';
import {beginOAuth,disconnectOAuth,GA4_COOKIE,oauthStatus} from '@/lib/ga4-oauth';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
export async function GET(request:Request){const a=await adminAuthStateFromRequest(request);if(!a.ok)return Response.json({error:a.error},{status:a.status,headers});if(a.role!=='owner')return Response.json({error:'Owner access required.'},{status:403,headers});return Response.json(await oauthStatus(),{headers});}
export async function POST(request:Request){
 const a=await adminAuthStateFromRequest(request);if(!a.ok)return Response.json({error:a.error},{status:a.status,headers});if(a.role!=='owner'||request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Open owner Settings to connect Analytics.'},{status:403,headers});
 if(!await rateLimit(request,'ga4-oauth',10,3600))return Response.json({error:'Please wait before retrying.'},{status:429,headers});
 const body=await request.json().catch(()=>null) as {action?:string}|null;
 try{if(body?.action==='disconnect')return Response.json({ok:true,...await disconnectOAuth(a.email)},{headers});if(body?.action!=='connect')return Response.json({error:'Unknown action.'},{status:400,headers});const r=await beginOAuth(a.email);return Response.json({url:r.url},{headers:{...headers,'Set-Cookie':`${GA4_COOKIE}=${r.cookie}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`}});}catch{return Response.json({error:'Google connection could not start. Check OAuth credentials in Cloudflare and retry.'},{status:503,headers});}
}
