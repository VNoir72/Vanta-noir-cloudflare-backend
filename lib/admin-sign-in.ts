import {getDbBinding,runtimeEnv} from './runtime-env';
import {z} from 'zod';
const cookieName='__Host-vn_admin_browser';
const id=z.string().regex(/^[a-f0-9]{64}$/);
export const signInDigest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('');
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(v=>v.toString(16).padStart(2,'0')).join('');
type Device={id:string;email:string;label:string;firstSeen:string;lastSeen:string;trustedUntil:string|null};
type Session={id:string;email:string;role:string;observedAt:string;loginAt:string|null;browser:string;country:string;deviceId:string|null;trusted:boolean;reviewedAt?:string};
async function meta<T>(key:string){const r=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();return r?JSON.parse(r.value) as T:null;}
async function put(key:string,value:unknown){await getDbBinding().prepare('INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(value)).run();}
export function adminBrowserLabel(request:Request){const ua=request.headers.get('user-agent')||'';const browser=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Other browser';const os=/iPad|Macintosh.*Mobile/.test(ua)?'iPad':/iPhone/.test(ua)?'iPhone':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':/Macintosh/.test(ua)?'Mac':/Linux/.test(ua)?'Linux':'unknown system';return browser+' on '+os;}
async function deviceFromRequest(request:Request,email:string){const raw=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(!raw||!id.safeParse(raw).success)return null;const device=await meta<Device>('admin-browser:'+await signInDigest(raw));return device?.email===email.toLowerCase()&&device.label===adminBrowserLabel(request)?device:null;}
type ObservationCache={expiresAt:number;sessionId:string;identityKey:string};
async function observationContext(request:Request,email:string){const device=await deviceFromRequest(request,email);return {device,key:device?.id||'unregistered:'+await signInDigest((request.headers.get('cf-connecting-ip')||'unknown')+':'+adminBrowserLabel(request))};}
export async function registerAdminBrowser(request:Request,email:string,role:string){
 const existing=await deviceFromRequest(request,email);if(existing){await put('admin-browser:'+existing.id,{...existing,lastSeen:new Date().toISOString()});return null;}
 const token=random(),key=await signInDigest(token),now=new Date().toISOString();await put('admin-browser:'+key,{id:key,email:email.toLowerCase(),label:adminBrowserLabel(request),firstSeen:now,lastSeen:now,trustedUntil:null} satisfies Device);
 const assertion=runtimeEnv().ADMIN_PASSWORD_LOGIN_ENABLED==='true'?null:request.headers.get('cf-access-jwt-assertion');
 if(assertion){const context=await observationContext(request,email),old=await meta<ObservationCache>('admin-token-observed:'+await signInDigest(assertion+':'+context.key));
  if(old){const session=await meta<Session>('admin-signin:'+old.sessionId);if(session&&!session.deviceId){await dbBindBrowser(old,key,assertion);}}
  const headers=new Headers(request.headers),cookies=(headers.get('cookie')||'').split(';').filter(v=>!v.trim().startsWith(cookieName+'='));cookies.push(cookieName+'='+token);headers.set('cookie',cookies.join(';'));await observeAdminSignIn(new Request(request.url,{headers}),{email,role},assertion);
 }
 // Lax recognises the browser on the top-level return from Cloudflare sign-in.
 return `${cookieName}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=31536000`;
}
async function dbBindBrowser(cached:ObservationCache,deviceId:string,assertion:string){const db=getDbBinding();await db.batch([
 db.prepare('INSERT OR IGNORE INTO store_meta(key,value) VALUES(?,?)').bind('admin-identity-session:'+await signInDigest(cached.identityKey+':'+deviceId),JSON.stringify({sessionId:cached.sessionId,expiresAt:Date.now()+90*86400000})),
 db.prepare('INSERT OR IGNORE INTO store_meta(key,value) VALUES(?,?)').bind('admin-token-observed:'+await signInDigest(assertion+':'+deviceId),JSON.stringify(cached)),
 db.prepare("UPDATE store_meta SET value=json_set(value,'$.deviceId',?) WHERE key=? AND json_extract(value,'$.deviceId') IS NULL").bind(deviceId,'admin-signin:'+cached.sessionId)
]);}
async function identityLogin(token:string){
 const team=new URL(runtimeEnv().CF_ACCESS_TEAM_DOMAIN||'');if(team.protocol!=='https:'||!team.hostname.endsWith('.cloudflareaccess.com'))throw Error('Invalid identity authority');
 const response=await fetch(new URL('/cdn-cgi/access/get-identity',team),{headers:{Cookie:'CF_Authorization='+token},redirect:'manual',signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error('Identity lookup unavailable');
 const reader=response.body?.getReader();if(!reader)throw Error('Empty identity response');const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768)throw Error('Identity response too large');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 return z.object({email:z.string().email(),iat:z.number().int().positive().max(Math.floor(Date.now()/1000)+60),ip:z.string().max(100).optional()}).parse(JSON.parse(new TextDecoder().decode(bytes)));
}
// Called only after JWT signature/issuer/audience/expiry and current staff role are verified.
export async function observeAdminSignIn(request:Request,auth:{email:string;role:string},token:string,passwordAuthenticatedAt?:number){
 const db=getDbBinding(),context=await observationContext(request,auth.email),tokenId=await signInDigest(token+':'+context.key),cached=await meta<ObservationCache>('admin-token-observed:'+tokenId);if(cached&&cached.expiresAt>Date.now())return;
 let sessionId=tokenId,identityKey=await signInDigest(token),loginAt:string|null=null;
 if(passwordAuthenticatedAt)loginAt=new Date(passwordAuthenticatedAt).toISOString();
 else try{const identity=await identityLogin(token);if(identity.email.toLowerCase()===auth.email.toLowerCase()){loginAt=new Date(identity.iat*1000).toISOString();identityKey=await signInDigest(auth.email.toLowerCase()+':'+identity.iat+':'+(identity.ip||'')+':'+adminBrowserLabel(request));}}catch{/* Fall back to the verified app session when identity metadata is unavailable. */}
 const identityAlias='admin-identity-session:'+await signInDigest(identityKey+':'+context.key),alias=await meta<{sessionId:string;expiresAt:number}>(identityAlias);
 if(alias&&alias.expiresAt>Date.now())sessionId=alias.sessionId;else sessionId=await signInDigest(identityKey+':'+context.key);
 const key='admin-signin:'+sessionId;
 if(!await meta<Session>(key)){
  const device=context.device,now=new Date().toISOString(),country=request.headers.get('cf-ipcountry')||'';
  const record:Session={id:sessionId,email:auth.email.toLowerCase(),role:auth.role,observedAt:now,loginAt,browser:adminBrowserLabel(request),country:/^[A-Z]{2}$/.test(country)?country:'Unknown',deviceId:device?.id||null,trusted:!!device?.trustedUntil&&device.trustedUntil>now};
  const raw=JSON.stringify(record);
  await db.batch([
   db.prepare('INSERT OR IGNORE INTO store_meta(key,value) VALUES(?,?)').bind(key,raw),
   db.prepare(`INSERT OR IGNORE INTO email_outbox(id,event_key,recipient,subject,body) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM store_meta WHERE key=? AND value=?)`).bind(crypto.randomUUID(),key,runtimeEnv().ADMIN_EMAIL!,(record.trusted?'Admin sign-in':'UNTRUSTED BROWSER · Admin sign-in')+' · Vanta Noir',`Admin access was observed for ${record.email} (${record.role}).\n\nBrowser: ${record.browser}\nTrust at sign-in: ${record.trusted?'Trusted browser':'Untrusted browser'}\nCountry: ${record.country}\nObserved: ${now} (UTC)\n${loginAt?'Identity sign-in: '+loginAt+' (UTC)\n':''}\nReview sign-ins and trusted browsers: https://api.vantanoir.store/api/admin/sign-in-security\n\nIf this was unexpected, review staff access and reset the account password to revoke password sessions, or revoke the Access session in Cloudflare Zero Trust. This alert reports successful admin access; it does not automatically block the browser.`,key,raw),
   db.prepare("INSERT INTO admin_audit(actor,action,entity,detail) SELECT ?,'admin sign-in',?,? WHERE EXISTS(SELECT 1 FROM store_meta WHERE key=? AND value=?) AND changes()>0").bind(auth.email,sessionId,JSON.stringify({browser:record.browser,country:record.country,trusted:record.trusted}),key,raw)
  ]);
 }
 // No raw authentication assertions, browser cookie values or IP addresses are retained.
 await put(identityAlias,{sessionId,expiresAt:Date.now()+90*86400000});
 await put('admin-token-observed:'+tokenId,{sessionId,identityKey,expiresAt:Date.now()+7*86400000});
}
export async function adminSecurityOverview(request:Request,email:string){const db=getDbBinding(),device=await deviceFromRequest(request,email);const [rows,devices]=await Promise.all([db.prepare("SELECT value FROM store_meta WHERE key LIKE 'admin-signin:%' ORDER BY json_extract(value,'$.observedAt') DESC LIMIT 100").all<{value:string}>(),db.prepare("SELECT value FROM store_meta WHERE key LIKE 'admin-browser:%' ORDER BY json_extract(value,'$.lastSeen') DESC LIMIT 100").all<{value:string}>()]);return {currentDevice:device?.id||null,sessions:rows.results.map(r=>JSON.parse(r.value) as Session),devices:devices.results.map(r=>JSON.parse(r.value) as Device)};}
export async function adminSecurityAction(input:unknown,actor:string){
 const v=z.discriminatedUnion('action',[z.object({action:z.literal('request-trust'),deviceId:id}).strict(),z.object({action:z.literal('approve-trust'),token:id}).strict(),z.object({action:z.literal('remove-trust'),deviceId:id}).strict(),z.object({action:z.literal('review'),sessionId:id}).strict()]).parse(input),db=getDbBinding();
 if(v.action==='request-trust'){
  const device=await meta<Device>('admin-browser:'+v.deviceId);if(!device)throw Error('Browser not found. Refresh the page.');
  const token=random(),hash=await signInDigest(token),challenge={deviceId:device.id,expiresAt:Date.now()+30*60000};
  const raw=JSON.stringify(challenge),pending='admin-trust-pending:'+device.id,challengeKey='admin-trust-challenge:'+hash;
  const result=await db.batch([
   db.prepare("INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE json_extract(store_meta.value,'$.expiresAt')<=?").bind(pending,raw,Date.now()),
   db.prepare('INSERT INTO store_meta(key,value) SELECT ?,? WHERE changes()>0 AND EXISTS(SELECT 1 FROM store_meta WHERE key=? AND value=?)').bind(challengeKey,raw,pending,raw),
   db.prepare('INSERT OR IGNORE INTO email_outbox(id,event_key,recipient,subject,body) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM store_meta WHERE key=? AND value=?)').bind(crypto.randomUUID(),'admin-trust:'+hash,runtimeEnv().ADMIN_EMAIL!,'Confirm trusted admin browser · Vanta Noir',`You requested to trust this admin browser for 90 days.\n\nAccount: ${device.email}\nBrowser: ${device.label}\nFirst seen: ${device.firstSeen}\n\nOpen this link, review the browser, and press Confirm trust:\nhttps://api.vantanoir.store/api/admin/sign-in-security#approve=${token}\n\nThis link expires in 30 minutes. If you did not request this, do not approve it. Trust changes the sign-in alert label; Authentication and staff permissions are still checked on every visit.`,challengeKey,raw)
  ]);
  if(!result[0].meta.changes)return {message:'A confirmation was already sent to your owner email. It expires after 30 minutes.'};
  return {message:'Confirmation sent to your owner email. Open the link to approve this browser.'};
 }
 if(v.action==='approve-trust'){
  const key='admin-trust-challenge:'+await signInDigest(v.token),challenge=await meta<{deviceId:string;expiresAt:number}>(key);if(!challenge||challenge.expiresAt<=Date.now())throw Error('This confirmation expired or was already used. Request a new one.');
  const changed=await db.batch([db.prepare("UPDATE store_meta SET value=json_set(value,'$.trustedUntil',?) WHERE key=? AND EXISTS(SELECT 1 FROM store_meta WHERE key=? AND value=? AND json_extract(value,'$.expiresAt')>?)").bind(new Date(Date.now()+90*86400000).toISOString(),'admin-browser:'+challenge.deviceId,key,JSON.stringify(challenge),Date.now()),db.prepare("INSERT INTO admin_audit(actor,action,entity,detail) SELECT ?,'trust admin browser',?,'Owner email confirmation; 90 days' WHERE changes()>0").bind(actor,challenge.deviceId),db.prepare('DELETE FROM store_meta WHERE key=?').bind(key),db.prepare('DELETE FROM store_meta WHERE key=?').bind('admin-trust-pending:'+challenge.deviceId)]);
  if(!changed[0].meta.changes)throw Error('Browser unavailable or confirmation already used.');return {message:'Browser trusted for 90 days. Every new sign-in still generates an alert.'};
 }
 if(v.action==='remove-trust'){
  await db.batch([db.prepare("UPDATE store_meta SET value=json_set(value,'$.trustedUntil',NULL) WHERE key=?").bind('admin-browser:'+v.deviceId),db.prepare("DELETE FROM store_meta WHERE key LIKE 'admin-trust-challenge:%' AND json_extract(value,'$.deviceId')=?").bind(v.deviceId),db.prepare('DELETE FROM store_meta WHERE key=?').bind('admin-trust-pending:'+v.deviceId),db.prepare("INSERT INTO admin_audit(actor,action,entity,detail) VALUES(?,'remove admin browser trust',?,'Future sign-ins will be flagged as untrusted')").bind(actor,v.deviceId)]);
  return {message:'Browser trust removed. This does not sign out an existing admin session.'};
 }
 await db.prepare("UPDATE store_meta SET value=json_set(value,'$.reviewedAt',?) WHERE key=?").bind(new Date().toISOString(),'admin-signin:'+v.sessionId).run();return {message:'Sign-in marked reviewed.'};
}
export async function cleanupAdminSignIns(){await getDbBinding().prepare("DELETE FROM store_meta WHERE json_valid(value) AND ((key LIKE 'admin-signin:%' AND datetime(json_extract(value,'$.observedAt'))<datetime('now','-90 days')) OR ((key LIKE 'admin-token-observed:%' OR key LIKE 'admin-identity-session:%') AND json_extract(value,'$.expiresAt')<?) OR ((key LIKE 'admin-trust-challenge:%' OR key LIKE 'admin-trust-pending:%') AND json_extract(value,'$.expiresAt')<?) OR (key LIKE 'admin-browser:%' AND datetime(json_extract(value,'$.lastSeen'))<datetime('now','-365 days')))").bind(Date.now(),Date.now()).run();}

