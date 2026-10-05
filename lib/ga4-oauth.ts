import {CompactEncrypt,compactDecrypt,base64url} from 'jose';
import {getDbBinding,runtimeEnv} from './runtime-env';
export const GA4_SCOPE='https://www.googleapis.com/auth/analytics.readonly';
export const GA4_CALLBACK='https://api.vantanoir.store/api/admin/ga4/callback';
export const GA4_COOKIE='__Host-vn-ga4';
export class GA4OAuthError extends Error {constructor(public reason:string){super(reason);}}
const recordKey='ga4-oauth-connection';
type Connection={id:string;encrypted:string;property:string;at:string};
export function oauthReady(){const e=runtimeEnv();return !!(e.GA4_OAUTH_CLIENT_ID&&e.GA4_OAUTH_CLIENT_SECRET&&/^\d+$/.test(e.GA4_PROPERTY_ID||''));}
async function key(){const secret=runtimeEnv().GA4_OAUTH_CLIENT_SECRET;if(!secret)throw new Error('Google OAuth setup is incomplete.');return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('vanta-ga4-oauth:'+secret)));}
async function seal(value:unknown){return new CompactEncrypt(new TextEncoder().encode(JSON.stringify(value))).setProtectedHeader({alg:'dir',enc:'A256GCM'}).encrypt(await key());}
async function unseal<T>(value:string):Promise<T>{return JSON.parse(new TextDecoder().decode((await compactDecrypt(value,await key())).plaintext));}
const random=()=>base64url.encode(crypto.getRandomValues(new Uint8Array(32)));
const hash=async(value:string)=>base64url.encode(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));
export async function oauthConnection():Promise<Connection|null>{if(!oauthReady())return null;const row=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind(recordKey).first<{value:string}>();return row?JSON.parse(row.value):null;}
export async function oauthStatus(){const c=await oauthConnection();return {ready:oauthReady(),connected:!!c,property:runtimeEnv().GA4_PROPERTY_ID||'',connectedAt:c?.at||null,redirectUri:GA4_CALLBACK};}
export async function beginOAuth(owner:string){
 if(!oauthReady())throw new Error('Add the Google OAuth client ID and secret in Cloudflare first.');
 const state=random(),verifier=random(),expires=Date.now()+10*60_000;
 await getDbBinding().prepare('INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('ga4-oauth-state:'+owner,JSON.stringify({hash:await hash(state),expires})).run();
 const cookie=await seal({state,verifier,owner,expires,property:runtimeEnv().GA4_PROPERTY_ID});
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:runtimeEnv().GA4_OAUTH_CLIENT_ID!,redirect_uri:GA4_CALLBACK,response_type:'code',scope:GA4_SCOPE,access_type:'offline',prompt:'consent',state,code_challenge:await hash(verifier),code_challenge_method:'S256'}).toString();
 return {url:url.toString(),cookie};
}
async function tokenRequest(body:Record<string,string>){
 const e=runtimeEnv();let response:Response;
 try{response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({...body,client_id:e.GA4_OAUTH_CLIENT_ID!,client_secret:e.GA4_OAUTH_CLIENT_SECRET!}),signal:AbortSignal.timeout(8000)});}catch{throw new GA4OAuthError('google_unreachable');}
 const p=await response.json().catch(()=>({})) as {error?:string;access_token?:string;refresh_token?:string;scope?:string;expires_in?:number};
 if(!response.ok)throw new GA4OAuthError(p.error==='invalid_client'?'invalid_client':p.error==='invalid_grant'?'invalid_grant':'token_exchange');
 if(!p.access_token)throw new GA4OAuthError('token_exchange');return p;
}
export async function finishOAuth(owner:string,state:string,code:string,cookie:string){
 let pending:{state:string;verifier:string;owner:string;expires:number;property:string};
 try{pending=await unseal<typeof pending>(cookie);}catch{throw new GA4OAuthError('browser_state');}
 if(!state||!code||pending.state!==state||pending.owner!==owner||pending.expires<Date.now()||pending.property!==runtimeEnv().GA4_PROPERTY_ID)throw new GA4OAuthError('browser_state');
 const claim=random();
 const used=await getDbBinding().prepare("UPDATE store_meta SET value=? WHERE key=? AND json_extract(value,'$.hash')=? AND CAST(json_extract(value,'$.expires') AS INTEGER)>?").bind(JSON.stringify({claim}),'ga4-oauth-state:'+owner,await hash(state),Date.now()).run();if(!used.meta.changes)throw new GA4OAuthError('browser_state');
 const p=await tokenRequest({grant_type:'authorization_code',code,redirect_uri:GA4_CALLBACK,code_verifier:pending.verifier});
 if(!p.refresh_token)throw new GA4OAuthError('missing_refresh_token');
 if(!p.scope?.split(' ').includes(GA4_SCOPE))throw new GA4OAuthError('missing_scope');
 // Verify the selected Google account can read this exact property before replacing a working connection.
 const probe=await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${pending.property}:runReport`,{method:'POST',headers:{Authorization:`Bearer ${p.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({dateRanges:[{startDate:'yesterday',endDate:'today'}],metrics:[{name:'sessions'}],limit:1}),signal:AbortSignal.timeout(8000)});
 if(!probe.ok){
  const error=await probe.json().catch(()=>({})) as {error?:{details?:{reason?:string}[]}};
  const disabled=error.error?.details?.some(d=>d.reason==='SERVICE_DISABLED');
  throw new GA4OAuthError(disabled?'api_disabled':probe.status===403?'property_access':probe.status===404?'property_missing':probe.status===429?'quota':'property_report');
 }
 const c:Connection={id:random(),property:pending.property,at:new Date().toISOString(),encrypted:await seal({refreshToken:p.refresh_token})};
 const saved=await getDbBinding().batch([
  getDbBinding().prepare("INSERT INTO store_meta(key,value) SELECT ?,? WHERE EXISTS(SELECT 1 FROM store_meta WHERE key=? AND json_extract(value,'$.claim')=?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(recordKey,JSON.stringify(c),'ga4-oauth-state:'+owner,claim),
  getDbBinding().prepare("INSERT INTO admin_audit(actor,action,entity,detail) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM store_meta WHERE key=? AND json_extract(value,'$.claim')=?)").bind(owner,'connect GA4',pending.property,'Read-only Google OAuth connection','ga4-oauth-state:'+owner,claim),
  getDbBinding().prepare("DELETE FROM store_meta WHERE key=? AND json_extract(value,'$.claim')=?").bind('ga4-oauth-state:'+owner,claim)
 ]);if(!saved[0].meta.changes)throw new Error('Connection superseded or disconnected. Start again.');
}
let accessCache:{id:string;token:string;until:number}|undefined;
export async function oauthAccessToken(c:Connection){if(c.property!==runtimeEnv().GA4_PROPERTY_ID)throw new Error('Reconnect after changing the property.');if(accessCache?.id===c.id&&accessCache.until>Date.now())return accessCache.token;const stored=await unseal<{refreshToken:string}>(c.encrypted);const p=await tokenRequest({grant_type:'refresh_token',refresh_token:stored.refreshToken});accessCache={id:c.id,token:p.access_token!,until:Date.now()+Math.max(0,Math.min(3600,p.expires_in||3600)-60)*1000};return p.access_token!;}
export async function disconnectOAuth(owner:string){
 const c=await oauthConnection();
 await getDbBinding().batch([getDbBinding().prepare('DELETE FROM store_meta WHERE key IN (?,?)').bind(recordKey,'ga4-oauth-state:'+owner),getDbBinding().prepare('INSERT INTO admin_audit(actor,action,entity,detail) VALUES(?,?,?,?)').bind(owner,'disconnect GA4',runtimeEnv().GA4_PROPERTY_ID||'','Local reporting authorization removed')]);accessCache=undefined;
 let revoked=!c;if(c)try{const s=await unseal<{refreshToken:string}>(c.encrypted);const r=await fetch('https://oauth2.googleapis.com/revoke',{method:'POST',body:new URLSearchParams({token:s.refreshToken}),signal:AbortSignal.timeout(8000)});revoked=r.ok;}catch{/* Local disconnect succeeds even when Google is unavailable. */}return {revoked};
}
