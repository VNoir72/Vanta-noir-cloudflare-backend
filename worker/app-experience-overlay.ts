import {appSession} from '../lib/app-session';
import {registerPush,sendOrderPushUpdates} from '../lib/customer-push';
import {runtimeEnv,getDbBinding} from '../lib/runtime-env';
import {checkApiRequest,secureResponse} from '../lib/http-policy';
export {sendOrderPushUpdates};
export async function experienceFetch(request:Request):Promise<Response|null>{
 const url=new URL(request.url),path=url.pathname;
 const push=path==='/api/customer/push';
 const history=path==='/api/customer/orders'&&(request.method==='PATCH'||request.method==='GET'&&url.searchParams.get('deleted')==='true');
 if(!push&&!history)return null;
 const env=runtimeEnv(),denied=checkApiRequest(request,env);if(denied)return secureResponse(denied,request,env);
 const reply=(data:unknown,status=200)=>secureResponse(Response.json(data,{status,headers:{'Cache-Control':'no-store'}}),request,env);
 try{
  if(env.CUSTOMER_APP_ENABLED!=='true')return reply({error:'Customer accounts unavailable.'},503);
  const session=await appSession(request);if(!session)return reply({error:'Please sign in again.'},401);
  const db=getDbBinding();
  if(push){
   if(!['POST','DELETE'].includes(request.method))return reply({error:'Method not allowed.'},405);
   const data=await request.json() as {token?:unknown};
   if(typeof data.token!=='string'||data.token.length>200||!/^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]+\]$/.test(data.token))return reply({error:'Invalid device token.'},400);
   await registerPush(session.id,data.token,request.method==='DELETE');return reply({registered:request.method==='POST'});
  }
  if(request.method==='PATCH'){
   const data=await request.json() as {reference?:unknown};
   if(typeof data.reference!=='string'||!data.reference||data.reference.length>120)return reply({error:'Invalid order reference.'},400);
   const owned=await db.prepare('SELECT reference FROM app_customer_orders WHERE reference=? AND customer_id=?').bind(data.reference,session.id).first();
   if(!owned)return reply({error:'Order not found.'},404);
   await db.prepare('DELETE FROM store_meta WHERE key=?').bind('hidden-order:'+session.id+':'+data.reference).run();return reply({restored:true});
  }
  const rows=await db.prepare(`SELECT o.reference,o.status,o.payment_status AS paymentStatus,o.total_kobo AS totalKobo,o.created_at AS createdAt FROM app_customer_orders a JOIN orders o ON o.reference=a.reference WHERE a.customer_id=? AND EXISTS(SELECT 1 FROM store_meta WHERE key='hidden-order:'||a.customer_id||':'||o.reference) ORDER BY o.created_at DESC LIMIT 100`).bind(session.id).all();
  return reply({orders:rows.results});
 }catch{return reply({error:'The request could not be completed. Please try again.'},503);}
}
