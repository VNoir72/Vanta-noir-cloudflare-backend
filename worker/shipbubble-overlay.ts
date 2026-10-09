import {bulkDispatchAdmin} from '../lib/bulk-dispatch-admin';
import {shippingWeightsAdmin} from '../lib/shipping-weights-admin';
import {shippingFetch} from './shipping-overlay';
import * as profiles from '../app/api/admin/parcel-profiles/route';
/** Add shipping routes while preserving the deployed admin and storefront assets. */
import {shipbubbleAdmin} from '../lib/shipbubble-admin';
import {shipbubbleWebhook} from '../lib/shipbubble-webhook';
import {runtimeEnv} from '../lib/runtime-env';
import {checkApiRequest,secureResponse} from '../lib/http-policy';
export async function shipbubbleFetch(request:Request){
 const path=new URL(request.url).pathname;
 if(!['/api/admin/bulk-dispatch','/api/admin/shipbubble','/api/shipbubble/webhook','/api/admin/shipping-weights','/api/admin/parcel-profiles'].includes(path))return shippingFetch(request);
 const env=runtimeEnv(),denied=checkApiRequest(request,env);if(denied)return secureResponse(denied,request,env);
 if(path==='/api/admin/bulk-dispatch')return secureResponse(await bulkDispatchAdmin(request),request,env);
 if(path==='/api/admin/shipping-weights')return secureResponse(await shippingWeightsAdmin(request),request,env);
 if(path==='/api/admin/parcel-profiles')return secureResponse(await (request.method==='GET'?profiles.GET(request):request.method==='PUT'?profiles.PUT(request):Promise.resolve(new Response('Method not allowed',{status:405}))),request,env);
 try{return secureResponse(await (path==='/api/admin/shipbubble'?shipbubbleAdmin(request):shipbubbleWebhook(request)),request,env);}
 catch{return secureResponse(Response.json({error:'Shipping could not complete this request. Please retry.'},{status:503}),request,env);}
}
