import {shipbubbleWebhook,linkShipbubbleShipment} from '../lib/shipbubble-webhook';
import {shipbubbleAdmin} from '../lib/shipbubble-admin';
import {checkShipbubbleLive} from '../lib/shipbubble-live';
export default {async fetch(r:Request){const p=new URL(r.url).pathname;if(p==='/hook')return shipbubbleWebhook(r);if(p==='/check')return Response.json(await checkShipbubbleLive());if(p==='/admin')return shipbubbleAdmin(r);if(p==='/link'){try{const b=await r.json() as {reference:string;shipmentId:string};return Response.json(await linkShipbubbleShipment(b.reference,b.shipmentId,'owner@example.com'));}catch{return new Response('Rejected',{status:400});}}return new Response('Not found',{status:404});}};
