import {POST as address} from '../app/api/shipping/address/route';
/** Content-only deployment bridge while the existing Worker asset bundle remains in use.
 * A normal full deployment uses worker/index.ts and the same app API handlers.
 */
import {POST as quotes} from '../app/api/shipping/quotes/route';
import {POST as checkout} from '../app/api/checkout/route';
import {POST as rewards} from '../app/api/rewards/quote/route';
import {GET as catalog} from '../app/api/catalog/route';
import {GET as storeSettings} from '../app/api/store-settings/route';
import * as comparison from '../app/api/admin/shipping-comparison/route';
import {runtimeEnv} from '../lib/runtime-env';
import {checkApiRequest,secureResponse} from '../lib/http-policy';
export {runComparisonJob} from '../lib/shipping-comparison-job';
const routes:Record<string,Record<string,(r:Request)=>Promise<Response>>>={
 '/api/shipping/address':{POST:address},
 '/api/store-settings':{GET:storeSettings},
 '/api/shipping/quotes':{POST:quotes},'/api/checkout':{POST:checkout},
 '/api/rewards/quote':{POST:rewards},'/api/catalog':{GET:catalog},
 '/api/admin/shipping-comparison':{GET:comparison.GET,POST:comparison.POST},
};
export async function shippingFetch(request:Request){
 const route=routes[new URL(request.url).pathname];if(!route)return null;
 const settings=runtimeEnv(),denied=checkApiRequest(request,settings);
 if(denied)return secureResponse(denied,request,settings);
 const handler=route[request.method];if(!handler)return secureResponse(Response.json({error:'Method not allowed.'},{status:405}),request,settings);
 try{return secureResponse(await handler(request),request,settings);}
 catch{return secureResponse(Response.json({error:'The store could not complete this request. Please try again.'},{status:500}),request,settings);}
}
