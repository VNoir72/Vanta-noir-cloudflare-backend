import {runtimeEnv} from './runtime-env';
import {corsOrigin} from './http-policy';
const cookieName='__Host-vn-session';
export function webSessionRequest(request:Request){
 return request.headers.get('X-Vanta-Web')==='1' && !!corsOrigin(request,runtimeEnv()) && new URL(request.url).protocol==='https:';
}
export function customerSessionToken(request:Request){
 const bearer=request.headers.get('Authorization');
 if(bearer)return bearer.startsWith('Bearer ')?bearer.slice(7):'';
 if(!webSessionRequest(request))return '';
 return request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
}
export function customerCookieResponse(request:Request,value:unknown,token:string,expiresAt:number){
 const headers=new Headers({'Cache-Control':'no-store'});
 if(webSessionRequest(request))headers.set('Set-Cookie',`${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${token?Math.max(0,Math.floor((expiresAt-Date.now())/1000)):0}`);
 return Response.json(value,{headers});
}
