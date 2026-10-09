/** Add shipping routes while preserving the deployed admin and storefront assets. */
import {shipbubbleAdmin} from '../lib/shipbubble-admin';
import {shipbubbleWebhook} from '../lib/shipbubble-webhook';
import {runtimeEnv} from '../lib/runtime-env';
import {checkApiRequest,secureResponse} from '../lib/http-policy';
export async function shipbubbleFetch(request:Request){
 const path=new URL(request.url).pathname;
 if(path!=='/api/admin/shipbubble'&&path!=='/api/shipbubble/webhook')return null;
 const env=runtimeEnv(),denied=checkApiRequest(request,env);if(denied)return secureResponse(denied,request,env);
 try{return secureResponse(await (path==='/api/admin/shipbubble'?shipbubbleAdmin(request):shipbubbleWebhook(request)),request,env);}
 catch{return secureResponse(Response.json({error:'Shipping could not complete this request. Please retry.'},{status:503}),request,env);}
}
