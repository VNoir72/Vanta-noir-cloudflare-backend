import {appSession} from '../lib/app-session';
import {registerPush,sendOrderPushUpdates} from '../lib/customer-push';
import {runtimeEnv,getDbBinding} from '../lib/runtime-env';
import {checkApiRequest,secureResponse} from '../lib/http-policy';
export {sendOrderPushUpdates};
export async function experienceFetch(request:Request):Promise<Response|null>{
 const url=new URL(request.url),path=url.pathname;
 const push=path==='/api/customer/push';
 const history=path==='/api/customer/orders'&&(request.method==='PATCH'||request.method==='DELETE'||request.method==='GET'&&url.searchParams.get('deleted')==='true');
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
  if(request.method==='PATCH'||request.method==='DELETE'){
   const data=await request.json() as {reference?:unknown;permanent?:unknown};
   if(typeof data.reference!=='string'||!data.reference||data.reference.length>120)return reply({error:'Invalid order reference.'},400);
   const owned=await db.prepare('SELECT reference FROM app_customer_orders WHERE reference=? AND customer_id=?').bind(data.reference,session.id).first();
   if(!owned)return reply({error:'Order not found.'},404);
   if(request.method==='DELETE'){
    if(data.permanent!==undefined&&typeof data.permanent!=='boolean')return reply({error:'Invalid deletion request.'},400);
    if(data.permanent===true){if(!await db.prepare('SELECT key FROM store_meta WHERE key=?').bind('hidden-order:'+session.id+':'+data.reference).first())return reply({error:'Move the order to the recycle bin first.'},409);}
    const key=(data.permanent===true?'purged-order:':'hidden-order:')+session.id+':'+data.reference;
    await db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify({removedAt:new Date().toISOString()})).run();return reply({removed:true,permanent:data.permanent===true});
   }
   if(await db.prepare('SELECT key FROM store_meta WHERE key=?').bind('purged-order:'+session.id+':'+data.reference).first())return reply({error:'This order was permanently removed from your history.'},409);
   await db.prepare('DELETE FROM store_meta WHERE key=?').bind('hidden-order:'+session.id+':'+data.reference).run();return reply({restored:true});
  }
  const rows=await db.prepare(`SELECT o.reference,o.status,o.payment_status AS paymentStatus,o.total_kobo AS totalKobo,o.created_at AS createdAt FROM app_customer_orders a JOIN orders o ON o.reference=a.reference WHERE a.customer_id=? AND NOT EXISTS(SELECT 1 FROM store_meta WHERE key='purged-order:'||a.customer_id||':'||o.reference) AND EXISTS(SELECT 1 FROM store_meta WHERE key='hidden-order:'||a.customer_id||':'||o.reference) ORDER BY o.created_at DESC LIMIT 100`).bind(session.id).all();
  return reply({orders:rows.results});
 }catch{return reply({error:'The request could not be completed. Please try again.'},503);}
}
