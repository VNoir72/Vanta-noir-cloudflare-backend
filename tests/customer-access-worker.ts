import {GET,POST} from '../app/api/admin/customer-access/route';
import {appSession} from '../lib/app-session';
import {customerApp} from '../lib/customer-app';
import {createPendingOrder} from '../lib/store-db';
import {POST as checkout} from '../app/api/checkout/route';
export default {async fetch(request:Request){
 const path=new URL(request.url).pathname;
 if(path==='/api/admin/customer-access')return request.method==='POST'?POST(request):GET(request);
 if(path==='/test/session')return Response.json({session:await appSession(request)});
 if(path==='/test/order'){try{await createPendingOrder(await request.json() as Parameters<typeof createPendingOrder>[0]);return Response.json({created:true});}catch(e){return Response.json({error:(e as Error).message},{status:400});}}
 if(path==='/api/checkout')return checkout(request);
 return customerApp(request);
}};
