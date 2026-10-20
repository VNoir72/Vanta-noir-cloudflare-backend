import {getDbBinding} from './runtime-env';
export async function rateLimit(request: Request, scope: string, maximum=20, seconds=600) {
  const address=request.headers.get("cf-connecting-ip") || "local";
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`${scope}:${address}`));
  const key=Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,"0")).join("");
  const now=Math.floor(Date.now()/1000); const db=getDbBinding();
  const row=await db.prepare(`INSERT INTO request_limits (key,hits,expires_at) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN expires_at < ? THEN 1 ELSE hits+1 END,
    expires_at=CASE WHEN expires_at < ? THEN excluded.expires_at ELSE expires_at END RETURNING hits`)
    .bind(key,now+seconds,now,now).first<{hits:number}>();
  if(row?.hits===maximum+1){
    // Fixed scope groups and hourly aggregates retain no IP, email, token or request URL.
    const group=scope.startsWith('api:admin')?'admin':scope.startsWith('api:customer')?'customer':scope==='order-lookup'?'tracking':'public';
    const at=new Date().toISOString(),signal='security-rate:'+at.slice(0,13)+':'+group;
    await db.prepare(`INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=json_set(store_meta.value,'$.count',json_extract(store_meta.value,'$.count')+1)`).bind(signal,JSON.stringify({at,count:1})).run().catch(()=>{});
  }
  return Boolean(row && row.hits<=maximum);
}
