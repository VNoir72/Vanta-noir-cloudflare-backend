export {sendOrderPushUpdates} from "../lib/customer-push";
import {customerApp} from '../lib/customer-app';
import {POST as checkout} from '../app/api/checkout/route';
import {runtimeEnv} from '../lib/runtime-env';
import {checkApiRequest,secureResponse} from '../lib/http-policy';
/** Add native account/payment routes without replacing deployed admin assets. */
export async function customerFetch(request:Request):Promise<Response|null>{
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/api/customer/')&&path!=='/api/checkout')return null;
 const env=runtimeEnv();
 const denied=checkApiRequest(request,env);if(denied)return secureResponse(denied,request,env);
 try {
  if(path.startsWith('/api/customer/'))return secureResponse(await customerApp(request),request,env);
  if(request.method!=='POST')return null;
  const body=await request.clone().json().catch(()=>null) as {paymentChannel?:string;client?:string}|null;
  // Preserve the deployed website's hosted checkout path.
  if(body?.client!=='native'&&body?.paymentChannel!=='bank_transfer'&&body?.paymentChannel!=='saved_card'&&!request.headers.has('Authorization'))return null;
  return secureResponse(await checkout(request),request,env);
 }catch{return secureResponse(Response.json({error:'The store is temporarily unavailable. Please try again.'},{status:503}),request,env);}
}
