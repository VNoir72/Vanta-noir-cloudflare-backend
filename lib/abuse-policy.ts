import {getDbBinding, runtimeEnv} from './runtime-env';
import {rateLimit} from './rate-limit';

// Reserve before the external call. Failures still consume budget: retries cost money too.
// One counter per service/window, shared across routes, cron jobs and Worker instances.
export async function serviceBudget(service:'email'|'sms'|'push', units=1) {
  if(!Number.isSafeInteger(units)||units<1||units>100)throw Error('Invalid service budget quantity.');
  const env=runtimeEnv();
  if((env.ABUSE_PAUSED_SERVICES||'').split(',').map(x=>x.trim()).includes(service))return false;
  const limits={email:[200,1000,10000],sms:[20,100,1000],push:[500,3000,30000]}[service];
  if(units>Math.min(...limits))return false;
  const now=Math.floor(Date.now()/1000), db=getDbBinding();
  for(const [i,seconds] of [3600,86400,30*86400].entries()){
    const row=await db.prepare(`INSERT INTO request_limits(key,hits,expires_at) VALUES (?,?,?)
      ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN expires_at<=? THEN excluded.hits ELSE hits+excluded.hits END,
      expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END
      WHERE expires_at<=? OR hits+excluded.hits<=? RETURNING hits`)
      .bind('service-budget:'+service+':'+seconds,units,now+seconds,now,now,now,limits[i]).first();
    if(!row)return false;
  }
  return true;
}

export async function apiAbuseGuard(request:Request):Promise<Response|null>{
  const path=new URL(request.url).pathname;
  if(!path.startsWith('/api/')||request.method==='OPTIONS'||path.startsWith('/api/media/'))return null;
  // Signed provider deliveries have independent authentication and deduplication.
  if(['/api/paystack/webhook','/api/payments/webhook','/api/shipbubble/webhook','/api/courier/webhook','/api/email/webhook'].includes(path))return null;
  const write=!['GET','HEAD'].includes(request.method);
  // Fixed scope names prevent random paths from growing the counter table.
  const scope=path.startsWith('/api/admin/')?'admin':path.startsWith('/api/customer/')?'customer':'public';
  if(!await rateLimit(request,'api:'+scope+':'+(write?'write':'read'),write?60:300,60))
    return Response.json({error:'Too many requests. Please wait a minute and try again.'},{status:429,headers:{'Retry-After':'60'}});
  return null;
}
