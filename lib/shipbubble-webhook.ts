import {z} from 'zod';
import {getDbBinding,runtimeEnv} from './runtime-env';
import {providerJson} from './shipping-comparison';
const shipmentSchema=z.object({order_id:z.string().regex(/^SB-[A-Za-z0-9-]{1,100}$/),status:z.enum(['pending','confirmed','picked_up','in_transit','completed','cancelled']),courier:z.object({name:z.string().trim().min(1).max(100),tracking_code:z.string().max(160).nullable().optional()})});
type Shipment=z.infer<typeof shipmentSchema>;
const mappingKey=(id:string)=>'shipbubble-shipment:'+id;
const referenceSchema=z.string().regex(/^VN-[A-Za-z0-9-]{1,100}$/);
export async function readWebhookBody(request:Request){
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536)throw Error('Payload too large');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}return bytes;
}
export async function verifyShipbubbleSignature(bytes:Uint8Array,signature:string,secret:string){
 if(!secret.startsWith('sb_prod_')||!/^([a-f0-9]{2}){64}$/i.test(signature))return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-512'},false,['verify']);
 return crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g)!,h=>parseInt(h,16)),bytes as Uint8Array<ArrayBuffer>);
}
export async function applyShipbubbleShipment(shipment:Shipment){
 const db=getDbBinding();const mapping=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(mappingKey(shipment.order_id)).first<{value:string}>();
 if(!mapping)return {linked:false,updated:false};
 const reference=referenceSchema.parse(JSON.parse(mapping.value).reference);
 const target=shipment.status==='completed'?'delivered':['picked_up','in_transit'].includes(shipment.status)?'shipped':null;
 // A cancelled shipment does not cancel or refund a paid store order. No backward transitions.
 if(!target)return {linked:true,updated:false};
 const eventId=`shipbubble:${shipment.order_id}:${target}`;
 const token=crypto.randomUUID(),lock='shipbubble-event:'+shipment.order_id,gate='EXISTS(SELECT 1 FROM store_meta WHERE key=? AND value=?)';
 const tracking=shipment.courier.tracking_code?.trim()||shipment.order_id;
 const result=await db.batch([
  db.prepare(`INSERT INTO store_meta(key,value) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM courier_events WHERE id=?) AND EXISTS(SELECT 1 FROM orders WHERE reference=? AND payment_status='paid' AND ((?='shipped' AND status IN ('paid','processing')) OR (?='delivered' AND status IN ('paid','processing','shipped')))) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).bind(lock,token,eventId,reference,target,target),
  db.prepare(`INSERT INTO courier_events(id,reference,status) SELECT ?,?,? WHERE ${gate}`).bind(eventId,reference,target,lock,token),
  db.prepare(`UPDATE orders SET status=?,carrier=?,tracking_number=?,updated_at=CURRENT_TIMESTAMP WHERE reference=? AND ${gate}`).bind(target,shipment.courier.name,tracking,reference,lock,token),
  db.prepare(`INSERT INTO admin_audit(actor,action,entity,detail) SELECT 'shipbubble','delivery update',?,? WHERE ${gate}`).bind(reference,target,lock,token),
  db.prepare('DELETE FROM store_meta WHERE key=? AND value=?').bind(lock,token)
 ]);
 return {linked:true,updated:!!result[2].meta.changes};
}
export async function shipbubbleWebhook(request:Request){
 if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:{Allow:'POST'}});
 const key=runtimeEnv().SHIPBUBBLE_API_KEY||'';if(!key.startsWith('sb_prod_'))return Response.json({error:'Receiver not configured'},{status:503});
 let raw:Uint8Array;try{raw=await readWebhookBody(request);}catch{return new Response('Payload too large',{status:413});}
 if(!await verifyShipbubbleSignature(raw,request.headers.get('x-ship-signature')||'',key))return new Response('Invalid signature',{status:401});
 try{
  const payload:unknown=JSON.parse(new TextDecoder().decode(raw));
  const event=z.object({event:z.string().max(100).optional()}).parse(payload);
  if(event.event&&!event.event.startsWith('shipment.'))return Response.json({ok:true,ignored:true});
  const shipment=shipmentSchema.parse(payload);const result=await applyShipbubbleShipment(shipment);
  // Only a fixed summary is retained; recipient contact/address and provider payload are not logged.
  await getDbBinding().prepare("INSERT INTO store_meta(key,value) VALUES('shipbubble-last-webhook',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify({receivedAt:new Date().toISOString(),authenticated:true,...result})).run();
  return Response.json({ok:true,...result});
 }catch(e){return Response.json({error:e instanceof z.ZodError||e instanceof SyntaxError?'Invalid event':'Update unavailable'},{status:e instanceof z.ZodError||e instanceof SyntaxError?400:503});}
}
export async function linkShipbubbleShipment(reference:string,shipmentId:string,actor:string){
 referenceSchema.parse(reference);z.string().regex(/^SB-[A-Za-z0-9-]{1,100}$/).parse(shipmentId);
 const db=getDbBinding(),key=runtimeEnv().SHIPBUBBLE_API_KEY||'';if(!key.startsWith('sb_prod_'))throw Error('Live key unavailable.');
 const order=await db.prepare("SELECT email FROM orders WHERE reference=? AND payment_status='paid' AND status IN ('paid','processing','shipped')").bind(reference).first<{email:string}>();if(!order)throw Error('Choose a paid, uncompleted store order.');
 const data=await providerJson('https://api.shipbubble.com/v1/shipping/labels/list/'+encodeURIComponent(shipmentId),key,undefined) as {results?:unknown[]};
 const raw=data?.results?.find(v=>z.object({order_id:z.string()}).safeParse(v).data?.order_id===shipmentId);
 const shipment=shipmentSchema.parse(raw);const destination=z.object({ship_to:z.object({email:z.string().email()})}).parse(raw);
 if(destination.ship_to.email.trim().toLowerCase()!==order.email.trim().toLowerCase())throw Error('Shipment recipient email does not match the store order.');
 const record=JSON.stringify({reference,linkedAt:new Date().toISOString()});
 await db.batch([
  db.prepare("INSERT OR IGNORE INTO store_meta(key,value) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM store_meta WHERE key=? AND json_extract(value,'$.reference')<>?)").bind('shipbubble-order:'+reference,shipmentId,mappingKey(shipmentId),reference),
  db.prepare("INSERT OR IGNORE INTO store_meta(key,value) SELECT ?,? WHERE EXISTS(SELECT 1 FROM store_meta WHERE key=? AND value=?)").bind(mappingKey(shipmentId),record,'shipbubble-order:'+reference,shipmentId),
  db.prepare("INSERT INTO admin_audit(actor,action,entity,detail) SELECT ?,'link Shipbubble shipment',?,? WHERE EXISTS(SELECT 1 FROM store_meta WHERE key=? AND value=?)").bind(actor,reference,shipmentId,mappingKey(shipmentId),record)
 ]);
 const saved=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind(mappingKey(shipmentId)).first<{value:string}>();
 if(!saved||JSON.parse(saved.value).reference!==reference)throw Error('Shipment or order is already linked. Review the existing booking.');
 return applyShipbubbleShipment(shipment);
}
