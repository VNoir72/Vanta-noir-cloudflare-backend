import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {finishOAuth,GA4_COOKIE} from '@/lib/ga4-oauth';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','Set-Cookie':`${GA4_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`};
 const a=await adminAuthStateFromRequest(request);if(!a.ok||a.role!=='owner')return new Response('Owner sign-in required. Return to Store admin and reconnect.',{status:403,headers});
 const p=new URL(request.url).searchParams,cookie=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(GA4_COOKIE+'='))?.slice(GA4_COOKIE.length+1)||'';
 let result='failed';try{if(!p.has('error')){await finishOAuth(a.email,p.get('state')||'',p.get('code')||'',cookie);result='connected';}}catch{/* Never reflect provider errors, authorization codes or tokens. */}
 return new Response(null,{status:303,headers:{...headers,Location:'/admin?ga4='+result}});
}
