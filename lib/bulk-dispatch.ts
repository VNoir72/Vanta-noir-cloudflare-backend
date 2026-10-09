import {terminalDispatchReady,terminalLiveQuotes,terminalPreflight,terminalBook,terminalBooked} from './terminal-dispatch';
import {z} from 'zod';
import {getDbBinding,runtimeEnv} from './runtime-env';
import {orderParcel} from './parcel-profiles';
import {orderMeasurements,orderMeasurementsSchema,type Measurements} from './order-measurements';
import {getPickupDetails} from './terminal-pickup';
import {providerJson,shipbubbleQuote,type ComparisonRate} from './shipping-comparison';

const refSchema=z.string().regex(/^VN-[A-Za-z0-9_-]{1,100}$/);
export class DispatchError extends Error{}
function fail(message:string):never{throw new DispatchError(message);}
const bookingKey=(reference:string)=>'dispatch-booking:'+reference;
type Order={id:string;reference:string;payment_status:string;status:string;email:string;first_name:string;last_name:string;phone:string;address_line_1:string;address_line_2:string;city:string;state:string;country:string;subtotal_kobo:number;shipping_kobo:number};
type Selected={rate:ComparisonRate;parcel:Measurements};
export type Booking={provider?:'shipbubble'|'terminal';state:'booking'|'booked'|'needs_review';reviewId:string;reference:string;startedAt?:number;shipmentId?:string;trackingUrl?:string;carrier?:string;chargeKobo?:number;message?:string};
export type DispatchReview={id:string;reference:string;fingerprint:string;parcel:Measurements;pickupDate:string;rate:ComparisonRate;expiresAt:number;shippingKobo:number;destination:string;recipient:string;address:string;pickupAddress:string;actor:string;packedRevision?:string};
async function meta<T>(key:string){const row=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();return row?JSON.parse(row.value) as T:null;}
async function digest(value:unknown){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),n=>n.toString(16).padStart(2,'0')).join('');}
async function snapshot(reference:string){
 refSchema.parse(reference);const db=getDbBinding();
 const order=await db.prepare('SELECT id,reference,payment_status,status,email,first_name,last_name,phone,address_line_1,address_line_2,city,state,country,subtotal_kobo,shipping_kobo FROM orders WHERE reference=?').bind(reference).first<Order>();
 if(!order||order.payment_status!=='paid'||!['paid','processing'].includes(order.status))fail('Only paid orders awaiting dispatch can be booked.');
 if(!['NG','Nigeria'].includes(order.country))fail('Bulk dispatch currently supports Nigerian orders.');
 const linked=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind('shipbubble-order:'+reference).first<{value:string}>();
 const terminalLinked=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind('terminal-order:'+reference).first<{value:string}>();
 const [selection,pickup,measurements,parcel]=await Promise.all([meta<Selected>('order-shipping:'+reference),getPickupDetails(),orderMeasurements(reference),orderParcel(reference)]);
 // Includes current approved profiles, quantities, saved measurements and address data.
 const fingerprint=await digest({order,selection,pickup,measurements,items:parcel.items,suggestion:parcel.suggestion});
 return {order,selection,pickup,measurements,parcel,fingerprint,linked:linked?.value||terminalLinked?.value};
}
export async function dispatchOrders(page=0){
 const orders=await getDbBinding().prepare("SELECT reference FROM orders WHERE payment_status='paid' AND status IN ('paid','processing') ORDER BY created_at DESC,reference LIMIT 21 OFFSET ?").bind(page*20).all<{reference:string}>();
 const rows=[];
 for(const {reference} of orders.results.slice(0,20)){
  try {const s=await snapshot(reference),booking=await meta<Booking>(bookingKey(reference)),packed=await meta<Packed>('dispatch-packed:'+reference);
   const defaults=s.measurements?.measurements||(s.parcel.suggestion?.approvedForCheckout?s.parcel.suggestion:null);
   rows.push({ok:true as const,reference,provider:s.selection?.rate.provider||'shipbubble',packed:packed?.fingerprint===s.fingerprint,packedStale:!!packed&&packed.fingerprint!==s.fingerprint,recipient:s.order.first_name+' '+s.order.last_name,address:[s.order.address_line_1,s.order.address_line_2,s.order.city,s.order.state].filter(Boolean).join(', '),carrier:s.selection?.rate.carrier||'',service:s.selection?.rate.service||'',shippingKobo:s.order.shipping_kobo,defaults:packed?.fingerprint===s.fingerprint?packed.parcel:defaults,fingerprint:s.fingerprint,source:s.measurements?'Saved packed measurements':'Current approved garment + box weights',linked:s.linked,booking,problem:s.linked?'Already linked to '+s.linked:booking?'Booking already attempted — see status below.':!s.selection?.rate.service?'No checkout courier was saved. Use individual shipping to arrange this older order.':!defaults?'Enter the packed parcel weight and dimensions.':''});
  }catch{rows.push({ok:false as const,reference,problem:'Order changed. Refresh the page.'});}
 }
 return {rows,hasMore:orders.results.length>20};
}
const reviewInput=z.object({reference:refSchema,fingerprint:z.string().regex(/^[a-f0-9]{64}$/),parcel:orderMeasurementsSchema,pickupDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),packed:z.literal(true),requirePacked:z.boolean().default(false)});
function dateAllowed(date:string){const d=new Date(date+'T00:00:00Z'),today=new Date(new Date().toISOString().slice(0,10)+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date&&d.getTime()>=today.getTime()+86400000&&d.getTime()<=today.getTime()+14*86400000;}
export function matchSelectedCourier(rates:ComparisonRate[],selected:ComparisonRate){
 const matches=rates.filter(r=>r.provider===selected.provider&&r.service===selected.service&&r.carrier.trim().toLowerCase()===selected.carrier.trim().toLowerCase()&&(!selected.courierId||r.courierId===selected.courierId));
 if(matches.length!==1||(selected.provider==='shipbubble'&&(!matches[0].courierId||!matches[0].requestToken)))fail('The customer’s chosen courier service is unavailable or ambiguous. No substitute has been booked.');
 return matches[0];
}
export async function reviewDispatch(raw:unknown,actor:string){
 const input=reviewInput.parse(raw);if(!dateAllowed(input.pickupDate))fail('Choose a pickup date from tomorrow through the next 14 days.');
 const s=await snapshot(input.reference);
 if(s.linked||await meta<Booking>(bookingKey(input.reference)))fail('This order already has a booking or an unresolved booking attempt.');
 if(s.fingerprint!==input.fingerprint)fail('Order details or weights changed. Reload before reviewing.');
 const packed=input.requirePacked?await meta<Packed>('dispatch-packed:'+input.reference):null;
 if(input.requirePacked&&(!packed||packed.fingerprint!==s.fingerprint||JSON.stringify(packed.parcel)!==JSON.stringify(input.parcel)))fail('Order is no longer packed and ready.');
 if(!s.selection?.rate.service)fail('No checkout courier was saved for this order. Use individual shipping.');
 if(!s.pickup)fail('Save your business pickup details first.');
 const o=s.order,p=s.pickup.details;
 const destination={first_name:o.first_name,last_name:o.last_name,email:o.email,phone:o.phone,line1:[o.address_line_1,o.address_line_2].filter(Boolean).join(', '),city:o.city,state:o.state,country:'NG',zip:/Postal code: ([^\n]+)/.exec(o.address_line_2||'')?.[1]||''};
 const rates=s.selection.rate.provider==='terminal'?await terminalLiveQuotes({...p,line1:[p.line1,p.line2].filter(Boolean).join(', ')},destination,{...input.parcel,valueNaira:o.subtotal_kobo/100},s.parcel.suggestion?.packagingWeightKg||0):await shipbubbleQuote(runtimeEnv().SHIPBUBBLE_API_KEY||'',{...p,line1:[p.line1,p.line2].filter(Boolean).join(', ')},{first_name:o.first_name,last_name:o.last_name,email:o.email,phone:o.phone,line1:[o.address_line_1,o.address_line_2].filter(Boolean).join(', '),city:o.city,state:o.state,country:'NG',zip:''},{...input.parcel,valueNaira:o.subtotal_kobo/100},'live',fetch,input.pickupDate);
 const rate=matchSelectedCourier(rates,s.selection.rate);
 if((await snapshot(input.reference)).fingerprint!==s.fingerprint)fail('Order details changed while checking rates. Reload before reviewing.');
 if(input.requirePacked&&(await meta<Packed>('dispatch-packed:'+input.reference))?.revision!==packed?.revision)fail('Packing changed during review.');
 const review:DispatchReview={id:crypto.randomUUID(),reference:input.reference,fingerprint:s.fingerprint,parcel:input.parcel,pickupDate:s.selection.rate.provider==='terminal'?'Next available courier pickup':input.pickupDate,rate,expiresAt:Date.now()+10*60_000,shippingKobo:o.shipping_kobo,destination:o.city+', '+o.state,recipient:o.first_name+' '+o.last_name,address:[o.address_line_1,o.address_line_2,o.city,o.state].filter(Boolean).join(', '),pickupAddress:[p.line1,p.line2,p.city,p.state].filter(Boolean).join(', '),actor,...(input.requirePacked?{packedRevision:packed!.revision}:{})};
 await getDbBinding().prepare('INSERT INTO store_meta(key,value) VALUES(?,?)').bind('dispatch-review:'+review.id,JSON.stringify(review)).run();
 return publicReview(review);
}
function publicReview(r:DispatchReview){return {id:r.id,provider:r.rate.provider,reference:r.reference,parcel:r.parcel,pickupDate:r.pickupDate,expiresAt:r.expiresAt,shippingKobo:r.shippingKobo,carrier:r.rate.carrier,service:r.rate.service,chargeKobo:r.rate.walletKobo,extraKobo:Math.max(0,r.rate.walletKobo-r.shippingKobo),destination:r.destination,recipient:r.recipient,address:r.address,pickupAddress:r.pickupAddress,delivery:r.rate.delivery};}
export async function dispatchReviews(ids:string[],actor:string){
 z.array(z.string().uuid()).max(1000).parse(ids);const result=[];
 for(const id of ids){const r=await meta<DispatchReview>('dispatch-review:'+id);if(r&&r.actor===actor)result.push({...publicReview(r),booking:await meta<Booking>(bookingKey(r.reference))});}
 return result;
}
function safeTracking(raw:unknown){try{const u=new URL(String(raw));return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
const createdShipment=z.object({order_id:z.string().regex(/^SB-[A-Za-z0-9-]{1,100}$/),status:z.string(),courier:z.object({name:z.string().min(1).max(100),tracking_code:z.string().max(160).nullable().optional()}),ship_to:z.object({email:z.string().email()}),payment:z.object({shipping_fee:z.number().finite().nonnegative(),currency:z.literal('NGN'),status:z.literal('completed')}),tracking_url:z.string().optional()});
export async function bookDispatch(id:string,actor:string){
 z.string().uuid().parse(id);const db=getDbBinding(),r=await meta<DispatchReview>('dispatch-review:'+id);
 if(!r||r.actor!==actor)fail('Review not found. Review the order again.');
 const previous=await meta<Booking>(bookingKey(r.reference));if(previous)return previous;
 if(r.packedRevision&&(await meta<Packed>('dispatch-packed:'+r.reference))?.revision!==r.packedRevision)fail('Order is no longer packed and ready. Review again.');
 if(Date.now()>=r.expiresAt||(r.rate.provider==='shipbubble'&&!dateAllowed(r.pickupDate)))fail('The reviewed rates expired. Review the order again.');
 const s=await snapshot(r.reference);
 // Another request may claim or complete the booking while the snapshot is read.
 const duringSnapshot=await meta<Booking>(bookingKey(r.reference));if(duringSnapshot)return duringSnapshot;
 if(s.linked)fail('This order already has a shipment.');
 if(s.fingerprint!==r.fingerprint)fail('Order, pickup details or weights changed. Review again before booking.');
 const isTerminal=r.rate.provider==='terminal';
 const key=runtimeEnv().SHIPBUBBLE_API_KEY||'';if(!isTerminal&&!key.startsWith('sb_prod_'))fail('A live Shipbubble connection is required.');
 // Read-only preflight: never automatically fund the wallet or charge the customer again.
 if(isTerminal){try{await terminalPreflight(r.rate);}catch(e){const concurrent=await meta<Booking>(bookingKey(r.reference));if(concurrent)return concurrent;throw e;}}
 const balance=isTerminal?{balance:Number.MAX_SAFE_INTEGER,currency:'NGN'}:z.object({currency:z.literal('NGN'),balance:z.number().finite().nonnegative()}).parse(await providerJson('https://api.shipbubble.com/v1/shipping/wallet/balance',key,undefined));
 const current=await snapshot(r.reference);
 // A competing booking changes order status (and may consume wallet balance).
 // Return its durable result before treating those changes as a stale review.
 const duringPreflight=await meta<Booking>(bookingKey(r.reference));if(duringPreflight)return duringPreflight;
 if(Math.round(balance.balance*100)<r.rate.walletKobo)fail('Your Shipbubble wallet needs funding before this booking.');
 if(current.linked)fail('This order already has a shipment.');
 if(current.fingerprint!==r.fingerprint)fail('Order details changed. Review again before booking.');
 const attempt:Booking={provider:r.rate.provider,state:'booking',reviewId:id,reference:r.reference,carrier:r.rate.carrier,startedAt:Date.now()};
 // Durable, per-order exclusion. Never retry a POST /labels after an ambiguous result.
 const claimed=await db.prepare("INSERT OR IGNORE INTO store_meta(key,value) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM store_meta WHERE key=?) AND NOT EXISTS(SELECT 1 FROM store_meta WHERE key=?) AND EXISTS(SELECT 1 FROM orders WHERE reference=? AND payment_status='paid' AND status IN ('paid','processing'))").bind(bookingKey(r.reference),JSON.stringify(attempt),'shipbubble-order:'+r.reference,'terminal-order:'+r.reference,r.reference).run();
 if(!claimed.meta.changes)return await meta<Booking>(bookingKey(r.reference))||fail('Order is already booked or no longer awaiting dispatch.');
 let shipmentId:string|undefined;
 try{
  const raw=isTerminal?await terminalBook(r.rate):await providerJson('https://api.shipbubble.com/v1/shipping/labels',key,{request_token:r.rate.requestToken,service_code:r.rate.service,courier_id:r.rate.courierId});
  // Persist the provider ID even if later response validation or local linking fails.
  if(isTerminal&&typeof (raw as any)?.shipment_id==='string'&&/^[A-Za-z0-9_-]{3,120}$/.test((raw as any).shipment_id)){shipmentId=(raw as any).shipment_id;await db.prepare('UPDATE store_meta SET value=? WHERE key=?').bind(JSON.stringify({...attempt,shipmentId}),bookingKey(r.reference)).run();}
  const terminalResult=isTerminal?terminalBooked(raw,s.order.email):null;
  const partial=z.object({order_id:z.string().regex(/^SB-[A-Za-z0-9-]{1,100}$/)}).safeParse(raw);if(partial.success){shipmentId=partial.data.order_id;await db.prepare('UPDATE store_meta SET value=? WHERE key=?').bind(JSON.stringify({...attempt,shipmentId}),bookingKey(r.reference)).run();}
  const shipment=terminalResult?{order_id:terminalResult.shipmentId,ship_to:{email:s.order.email},tracking_url:terminalResult.trackingUrl,payment:{shipping_fee:r.rate.walletKobo/100},courier:{name:r.rate.carrier,tracking_code:terminalResult.trackingNumber}}:createdShipment.parse(raw);
  if(shipment.ship_to.email.trim().toLowerCase()!==s.order.email.trim().toLowerCase())throw Error('Recipient mismatch');
  const trackingUrl=safeTracking(shipment.tracking_url),chargeKobo=Math.round(shipment.payment.shipping_fee*100);
  const done:Booking={...attempt,state:'booked',shipmentId:shipment.order_id,trackingUrl,chargeKobo,carrier:shipment.courier.name,...(chargeKobo!==r.rate.walletKobo?{message:'Provider charge differs from the reviewed quote. Check the Shipbubble receipt.'}:{})};
  const mapping=JSON.stringify({reference:r.reference,linkedAt:new Date().toISOString()});
  // One transaction records the shipment, tracking and audit before reporting success.
  await db.batch([
   db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?)').bind((isTerminal?'terminal-order:':'shipbubble-order:')+r.reference,shipment.order_id),
   db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?)').bind((isTerminal?'terminal-shipment:':'shipbubble-shipment:')+shipment.order_id,mapping),
   db.prepare("UPDATE orders SET carrier=?,tracking_number=?,tracking_url=?,status=CASE WHEN status='paid' THEN 'processing' ELSE status END,updated_at=CURRENT_TIMESTAMP WHERE reference=?").bind(shipment.courier.name,shipment.courier.tracking_code||shipment.order_id,trackingUrl,r.reference),
   db.prepare('UPDATE store_meta SET value=? WHERE key=?').bind(JSON.stringify(done),bookingKey(r.reference)),
   db.prepare('INSERT INTO admin_audit(actor,action,entity,detail) VALUES(?,?,?,?)').bind(actor,'bulk dispatch booked',r.reference,JSON.stringify({reviewId:id,shipmentId:shipment.order_id,chargeKobo,pickupDate:r.pickupDate,parcel:r.parcel}))
  ]);
  return done;
 }catch{
  const uncertain:Booking={...attempt,state:'needs_review',...(shipmentId?{shipmentId}:{}),message:'Booking may have reached the provider. Check its shipment list before taking further action. Automatic retry is blocked to prevent a second charge.'};
  await db.prepare('UPDATE store_meta SET value=? WHERE key=?').bind(JSON.stringify(uncertain),bookingKey(r.reference)).run();return uncertain;
 }
}

// Packed status is tied to the current address, items, weights and pickup profile.
type Packed={revision:string;fingerprint:string;parcel:Measurements;markedAt:string;actor:string};
export async function markDispatchPacked(raw:unknown,actor:string){
 const input=z.object({reference:refSchema,fingerprint:z.string(),parcel:orderMeasurementsSchema,packed:z.boolean()}).parse(raw);
 const s=await snapshot(input.reference);if(s.linked||await meta<Booking>(bookingKey(input.reference)))fail('Already booked; packing cannot be changed.');
 if(s.fingerprint!==input.fingerprint)fail('Order details changed. Reload before marking packed.');
 if(!input.packed){await getDbBinding().prepare('DELETE FROM store_meta WHERE key=?').bind('dispatch-packed:'+input.reference).run();return {packed:false};}
 const value:Packed={revision:crypto.randomUUID(),fingerprint:s.fingerprint,parcel:input.parcel,markedAt:new Date().toISOString(),actor};
 await getDbBinding().prepare('INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('dispatch-packed:'+input.reference,JSON.stringify(value)).run();
 return {packed:true};
}
export async function readyDispatchOrders(provider='all',after=''){
 z.string().max(120).parse(after);
 z.enum(['all','shipbubble','terminal']).parse(provider);
 const refs=await getDbBinding().prepare("SELECT o.reference FROM orders o JOIN store_meta p ON p.key='dispatch-packed:'||o.reference WHERE o.payment_status='paid' AND o.status IN ('paid','processing') AND NOT EXISTS(SELECT 1 FROM store_meta b WHERE b.key='dispatch-booking:'||o.reference) AND o.reference>? ORDER BY o.reference LIMIT 51").bind(after).all<{reference:string}>();
 const ready=[],skipped=[];
 for(const {reference} of refs.results.slice(0,50)){try{const s=await snapshot(reference),p=await meta<Packed>('dispatch-packed:'+reference);if(provider!=='all'&&s.selection?.rate.provider!==provider)continue;if(!p||p.fingerprint!==s.fingerprint||s.linked||!s.selection?.rate.service)throw Error();if(s.selection.rate.provider==='terminal'&&!await terminalDispatchReady()){skipped.push({reference,reason:'Terminal wallet not ready'});continue;}ready.push({reference,fingerprint:s.fingerprint,parcel:p.parcel});}catch{skipped.push({reference,reason:'Order or packing details changed; check again'});}}
 return {ready,skipped,next:refs.results.length>50?refs.results[49].reference:null};
}
export async function startDispatchBatch(actor:string){const id=crypto.randomUUID();await getDbBinding().prepare('INSERT INTO store_meta(key,value) VALUES(?,?)').bind('dispatch-batch:'+id,JSON.stringify({actor,createdAt:new Date().toISOString()})).run();return {id};}
export async function appendDispatchReview(batchId:string,reviewId:string,actor:string){
 z.string().uuid().parse(batchId);z.string().uuid().parse(reviewId);const b=await meta<{actor:string}>('dispatch-batch:'+batchId),r=await meta<DispatchReview>('dispatch-review:'+reviewId);if(b?.actor!==actor||r?.actor!==actor)fail('Batch not found.');await getDbBinding().prepare('INSERT OR IGNORE INTO store_meta(key,value) VALUES(?,?)').bind('dispatch-batch-item:'+batchId+':'+reviewId,reviewId).run();return {saved:true};
}
export async function dispatchBatchReviews(batchId:string,actor:string){
 z.string().uuid().parse(batchId);const b=await meta<{actor:string}>('dispatch-batch:'+batchId);if(b?.actor!==actor)fail('Batch not found.');
 const rows=await getDbBinding().prepare("SELECT r.value AS review,b.value AS booking FROM store_meta i JOIN store_meta r ON r.key='dispatch-review:'||i.value LEFT JOIN store_meta b ON b.key='dispatch-booking:'||json_extract(r.value,'$.reference') WHERE i.key>=? AND i.key<? LIMIT 1000").bind('dispatch-batch-item:'+batchId+':','dispatch-batch-item:'+batchId+':\uffff').all<{review:string;booking:string|null}>();
 return rows.results.flatMap(row=>{const r=JSON.parse(row.review) as DispatchReview;return r.actor===actor?[{...publicReview(r),booking:row.booking?JSON.parse(row.booking) as Booking:null}]:[];});
}
