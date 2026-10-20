import {POST} from '../app/api/orders/track/route';
import {shipbubbleWebhook} from '../lib/shipbubble-webhook';
import {trackingPageResponse} from '../lib/tracking-page';
import {deliveryMonitoring,securityMonitoring,demandDigest} from '../lib/operational-automations';
import {configSchema} from '../lib/automation-policy';
import {processEmailOutbox} from '../lib/commerce-db';
const methods={deliveryMonitoring,securityMonitoring,demandDigest,processEmailOutbox};
export default {async fetch(r:Request){const p=new URL(r.url).pathname;if(p==='/track')return POST(r);if(p==='/hook')return shipbubbleWebhook(r);if(p==='/page'||p==='/client.js')return trackingPageResponse(p);if(p==='/send')return Response.json(await processEmailOutbox(30));try{const b=await r.json() as {method:keyof typeof methods;config?:unknown};return Response.json(await methods[b.method](configSchema.parse(b.config||{}) as never));}catch(e){return Response.json({error:(e as Error).message},{status:500});}}};
