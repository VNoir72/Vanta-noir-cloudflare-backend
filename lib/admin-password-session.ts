import {z} from 'zod';
import {firebaseReady, firebaseSessionValid, verifyFirebaseCustomer} from './firebase-customer';
import {getDbBinding, runtimeEnv} from './runtime-env';
import {staffRole} from './staff-role';
import {rateLimit} from './rate-limit';
import {observeAdminSignIn, signInDigest} from './admin-sign-in';
import {customerEmail} from './customer-email';

export const adminSessionCookie = '__Host-vn-admin-session';
const lifetime = 8 * 60 * 60;
const sessionSchema = z.object({uid:z.string().min(1).max(128),email:z.string().email(),authenticatedAt:z.number().positive(),expiresAt:z.number().positive()});
export const adminPasswordEnabled = () => runtimeEnv().ADMIN_PASSWORD_LOGIN_ENABLED === 'true';
const json = (body:unknown,status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const cookie = (token:string,age:number) => `${adminSessionCookie}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
function sessionToken(request:Request) {
  const values=(request.headers.get('cookie')||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(adminSessionCookie+'='));
  const token=values.length===1?values[0].slice(adminSessionCookie.length+1):'';
  return /^[a-f0-9]{64}$/.test(token)?token:null;
}
async function removeSession(request:Request) {
  const token=sessionToken(request);
  if(token)await getDbBinding().prepare('DELETE FROM store_meta WHERE key=?').bind('admin-password-session:'+await signInDigest(token)).run();
}
export async function adminPasswordIdentity(request:Request) {
  if(!adminPasswordEnabled()||!firebaseReady())return null;
  const token=sessionToken(request);if(!token)return null;
  const key='admin-password-session:'+await signInDigest(token);
  const row=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();
  if(!row)return null;
  const parsed=sessionSchema.safeParse(JSON.parse(row.value));
  if(!parsed.success||parsed.data.expiresAt<=Date.now()) {await removeSession(request);return null;}
  const session=parsed.data;
  // Provider revocation, password resets, disabled accounts, and current staff membership
  // take effect immediately. Customer sessions and arbitrary bearer tokens never apply.
  if(!await firebaseSessionValid(session.uid,session.email,session.authenticatedAt)||!await staffRole(session.email)) {
    await removeSession(request);return null;
  }
  return session;
}
export async function adminPasswordEndpoint(request:Request):Promise<Response> {
  if(!adminPasswordEnabled()||!runtimeEnv().ADMIN_EMAIL?.trim()||!firebaseReady())return json({error:'Password sign-in is not available yet.'},503);
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Open the admin sign-in page to continue.'},403);
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return json({error:'JSON required.'},415);
  const path=new URL(request.url).pathname;
  try {
    if(path==='/api/admin-auth/logout') {
      await removeSession(request);const response=json({ok:true});response.headers.set('Set-Cookie',cookie('',0));return response;
    }
    if(path==='/api/admin-auth/email')return await customerEmail(request);
    if(path!=='/api/admin-auth/session')return json({error:'Not found.'},404);
    if(!await rateLimit(request,'admin-password-login',10,600))return json({error:'Please wait before signing in again.'},429);
    const input=z.object({idToken:z.string().min(100).max(10000)}).strict().parse(await request.json());
    let identity;
    try {identity=await verifyFirebaseCustomer(input.idToken);}catch{return json({error:'Sign in again with a verified email address.'},401);}
    if(identity.provider!=='password')return json({error:'Use your email and password to sign in.'},401);
    const role=await staffRole(identity.email);
    if(!role)return json({error:'This account does not have admin access.'},403);
    if(await getDbBinding().prepare('SELECT key FROM store_meta WHERE key=?').bind('identity-deletion:'+identity.uid).first())return json({error:'Account deletion is still completing.'},403);
    const token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,'0')).join('');
    await removeSession(request);
    await getDbBinding().prepare('INSERT INTO store_meta(key,value) VALUES(?,?)').bind('admin-password-session:'+await signInDigest(token),JSON.stringify({uid:identity.uid,email:identity.email,authenticatedAt:identity.authenticatedAt,expiresAt:Date.now()+lifetime*1000})).run();
    await observeAdminSignIn(request,{email:identity.email,role},token,identity.authenticatedAt).catch(()=>console.error('Admin sign-in recording unavailable'));
    const response=json({ok:true});response.headers.set('Set-Cookie',cookie(token,lifetime));return response;
  } catch(error) {
    if(error instanceof z.ZodError||error instanceof SyntaxError)return json({error:'Invalid sign-in request.'},400);
    return json({error:'Sign-in is temporarily unavailable. Please try again.'},503);
  }
}
export async function cleanupAdminPasswordSessions() {
  await getDbBinding().prepare("DELETE FROM store_meta WHERE key LIKE 'admin-password-session:%' AND json_extract(value,'$.expiresAt')<=?").bind(Date.now()).run();
}
