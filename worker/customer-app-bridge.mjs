import current from './current.js';
import {customerFetch,sendOrderPushUpdates} from './customer-app-overlay.js';
export default {...current,async scheduled(event,env,ctx){if(current.scheduled)await current.scheduled(event,env,ctx);ctx.waitUntil(sendOrderPushUpdates());},async fetch(request,env,ctx){
 const response=await customerFetch(request);if(response)return response;
 const result=await current.fetch(request,env,ctx);
 if(new URL(request.url).pathname==='/api/catalog'&&request.method==='GET'&&result.ok){
  const data=await result.json();data.checkout={...data.checkout,customerAccountsEnabled:env.CUSTOMER_APP_ENABLED==='true',customTransferEnabled:env.CUSTOM_TRANSFER_ENABLED==='true'};
  return Response.json(data,{status:result.status,headers:result.headers});
 }
 return result;
}};
