import {SHIPPING_COUNTRIES,shippingCountryName} from './shipping-countries';
import {verifyLiveCredential} from './terminal-live';
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
 if(!SHIPPING_COUNTRIES.some(([code,name])=>code===order.country||name===order.country))fail('Delivery country is not supported.');
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
const reviewInput=z.object({reference:refSchema,fingerprint:z.string().regex(/^[a-f0-9]{64}$/),parcel:orderMeasurementsSchema,pickupDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),packed:z.literal(true),requirePacked:z.boolean().default(false),alternativeRateId:z.string().uuid().optional(),provider:z.enum(['shipbubble','terminal']).optional()});
function dateAllowed(date:string){const d=new Date(date+'T00:00:00Z'),today=new Date(new Date().toISOString().slice(0,10)+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date&&d.getTime()>=today.getTime()+86400000&&d.getTime()<=today.getTime()+14*86400000;}
export function matchSelectedCourier(rates:ComparisonRate[],selected:ComparisonRate){
 const matches=rates.filter(r=>r.provider===selected.provider&&r.service===selected.service&&r.carrier.trim().toLowerCase()===selected.carrier.trim().toLowerCase()&&(!selected.courierId||r.courierId===selected.courierId));
 if(matches.length!==1||(selected.provider==='shipbubble'&&(!matches[0].courierId||!matches[0].requestToken)))fail('The customer’s chosen courier service is unavailable or ambiguous. Enable another courier in Shipbubble, then use Choose another courier to select a replacement. No substitute has been booked.');
 return matches[0];
}
async function dispatchContext(raw:unknown){
 const input=reviewInput.parse(raw);if(!dateAllowed(input.pickupDate))fail('Choose a pickup date from tomorrow through the next 14 days.');
 const s=await snapshot(input.reference);
 if(s.linked||await meta<Booking>(bookingKey(input.reference)))fail('This order already has a booking or an unresolved booking attempt.');
 if(s.fingerprint!==input.fingerprint)fail('Order details or weights changed. Reload before reviewing.');
 const packed=input.requirePacked?await meta<Packed>('dispatch-packed:'+input.reference):null;
 if(input.requirePacked&&(!packed||packed.fingerprint!==s.fingerprint||JSON.stringify(packed.parcel)!==JSON.stringify(input.parcel)))fail('Order is no longer packed and ready.');
 if(!s.selection?.rate.service)fail('No checkout courier was saved for this order. Use individual shipping.');
 if(!s.pickup)fail('Save your business pickup details first.');
 const o=s.order,p=s.pickup.details;
 const provider=input.provider||s.selection.rate.provider;
 if(provider==='terminal'&&!await terminalDispatchReady())fail('Terminal is unavailable. Enable another courier in Shipbubble and refresh the alternatives.');
 const country=SHIPPING_COUNTRIES.find(([code,name])=>code===o.country||name===o.country)![0];
 if(country!=='NG'&&provider==='terminal')fail('International Terminal dispatch is not enabled.');
 const destination={first_name:o.first_name,last_name:o.last_name,email:o.email,phone:o.phone,line1:[o.address_line_1,o.address_line_2].filter(Boolean).join(', '),city:o.city,state:o.state,country,zip:/Postal code: ([^\n]+)/.exec(o.address_line_2||'')?.[1]||''};
 let rates:ComparisonRate[];try{rates=provider==='terminal'?await terminalLiveQuotes({...p,line1:[p.line1,p.line2].filter(Boolean).join(', ')},destination,{...input.parcel,valueNaira:o.subtotal_kobo/100},s.parcel.suggestion?.packagingWeightKg||0):await shipbubbleQuote(runtimeEnv().SHIPBUBBLE_API_KEY||'',{...p,line1:[p.line1,p.line2].filter(Boolean).join(', ')},{first_name:o.first_name,last_name:o.last_name,email:o.email,phone:o.phone,line1:[o.address_line_1,o.address_line_2].filter(Boolean).join(', '),city:o.city,state:o.state,country,zip:''},{...input.parcel,valueNaira:o.subtotal_kobo/100},'live',fetch,input.pickupDate);}catch{fail('Courier rates are unavailable. Enable another courier in Shipbubble or choose another connected provider, then refresh alternatives. No booking has been submitted.');}
 return {input,s,packed,o,p,country,rates,provider};
}

type Alternative={actor:string;reference:string;fingerprint:string;parcel:Measurements;pickupDate:string;expiresAt:number;rate:ComparisonRate};
export async function dispatchAlternatives(raw:unknown,actor:string){
 const {input,s,rates}=await dispatchContext(raw);
 const options=[];
 for(const rate of rates.filter(r=>r.provider==='terminal'||r.courierId&&r.requestToken).sort((a,b)=>a.walletKobo-b.walletKobo)){
  const id=crypto.randomUUID();const value:Alternative={actor,reference:input.reference,fingerprint:s.fingerprint,parcel:input.parcel,pickupDate:input.pickupDate,expiresAt:Date.now()+10*60_000,rate};
  await getDbBinding().prepare('INSERT INTO store_meta(key,value) VALUES(?,?)').bind('dispatch-alternative:'+id,JSON.stringify(value)).run();
  options.push({id,provider:rate.provider,carrier:rate.carrier,service:rate.service,chargeKobo:rate.walletKobo,delivery:rate.delivery});
 }
 if(!options.length)fail('No couriers are available. Enable another service in Shipbubble and refresh alternatives.');
 await getDbBinding().prepare("DELETE FROM store_meta WHERE key LIKE 'dispatch-alternative:%' AND json_extract(value,'$.expiresAt')<?").bind(Date.now()).run();
 return {options};
}
export async function reviewDispatch(raw:unknown,actor:string){
 const {input,s,packed,o,p,country,rates,provider}=await dispatchContext(raw);
 let selected=s.selection!.rate;
 if(input.alternativeRateId){const alternative=await meta<Alternative>('dispatch-alternative:'+input.alternativeRateId);if(!alternative||alternative.actor!==actor||alternative.reference!==input.reference||alternative.fingerprint!==s.fingerprint||alternative.expiresAt<=Date.now()||alternative.pickupDate!==input.pickupDate||JSON.stringify(alternative.parcel)!==JSON.stringify(input.parcel))fail('Alternative courier details changed or expired. Refresh alternatives.');selected=alternative.rate;}
 const rate=matchSelectedCourier(rates,selected);
 if((await snapshot(input.reference)).fingerprint!==s.fingerprint)fail('Order details changed while checking rates. Reload before reviewing.');
 if(input.requirePacked&&(await meta<Packed>('dispatch-packed:'+input.reference))?.revision!==packed?.revision)fail('Packing changed during review.');
 const review:DispatchReview={id:crypto.randomUUID(),reference:input.reference,fingerprint:s.fingerprint,parcel:input.parcel,pickupDate:provider==='terminal'?'Next available courier pickup':input.pickupDate,rate,expiresAt:Date.now()+10*60_000,shippingKobo:o.shipping_kobo,destination:[o.city,o.state,shippingCountryName(country)].filter(Boolean).join(', '),recipient:o.first_name+' '+o.last_name,address:[o.address_line_1,o.address_line_2,o.city,o.state].filter(Boolean).join(', '),pickupAddress:[p.line1,p.line2,p.city,p.state].filter(Boolean).join(', '),actor,...(input.requirePacked?{packedRevision:packed!.revision}:{})};
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
type WalletProvider='shipbubble'|'terminal';
const providerName=(p:WalletProvider)=>p==='terminal'?'Terminal Africa':'Shipbubble';
const walletMoney=(kobo:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN'}).format(kobo/100);
async function walletBalance(provider:WalletProvider){
 try{
  if(provider==='terminal'){
   const wallet=await verifyLiveCredential(runtimeEnv().TERMINAL_AFRICA_LIVE_SECRET_KEY||'',true);
   if(!wallet.walletActive||!wallet.walletEnabled)fail('Terminal Africa wallet is not active. Booking stopped.');
   return wallet.balanceKobo!;
  }
  const key=runtimeEnv().SHIPBUBBLE_API_KEY||'';
  if(!key.startsWith('sb_prod_'))fail('A live Shipbubble connection is required.');
  const wallet=z.object({currency:z.literal('NGN'),balance:z.number().finite().nonnegative()}).parse(await providerJson('https://api.shipbubble.com/v1/shipping/wallet/balance',key,undefined));
  const kobo=Math.round(wallet.balance*100);if(!Number.isSafeInteger(kobo))throw Error();return kobo;
 }catch(e){if(e instanceof DispatchError)throw e;fail(providerName(provider)+' wallet balance could not be verified. Booking stopped. Please retry the balance check.');}
}
function requireWalletFunds(provider:WalletProvider,balance:number,required:number){
 if(balance<required)fail('Insufficient funds in your '+providerName(provider)+' wallet. Available: '+walletMoney(balance)+'. Required: '+walletMoney(required)+'. Top up '+walletMoney(required-balance)+' before booking. No pickup was requested by this check.');
}
export async function checkDispatchFunds(raw:unknown,actor:string){
 const ids=z.array(z.string().uuid()).min(1).max(1000).parse(raw),totals={shipbubble:0,terminal:0},seen=new Set<string>();
 for(const id of ids){const r=await meta<DispatchReview>('dispatch-review:'+id);if(!r||r.actor!==actor)fail('Review not found. Review the order again.');
  if(seen.has(r.reference))continue;seen.add(r.reference);
  if(await meta<Booking>(bookingKey(r.reference)))continue;
  if(Date.now()>=r.expiresAt)fail('The reviewed rates expired. Review the order again.');
  totals[r.rate.provider]+=r.rate.walletKobo;
 }
 const wallets=[];
 for(const provider of ['shipbubble','terminal'] as const){const required=totals[provider];if(!required)continue;const balance=await walletBalance(provider);requireWalletFunds(provider,balance,required);wallets.push({provider,balanceKobo:balance,requiredKobo:required});}
 return {ready:true,wallets};
}
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
 const balance=await walletBalance(r.rate.provider);
 const current=await snapshot(r.reference);
 // A competing booking changes order status (and may consume wallet balance).
 // Return its durable result before treating those changes as a stale review.
 const duringPreflight=await meta<Booking>(bookingKey(r.reference));if(duringPreflight)return duringPreflight;
 requireWalletFunds(r.rate.provider,balance,r.rate.walletKobo);
 if(current.linked)fail('This order already has a shipment.');
 if(current.fingerprint!==r.fingerprint)fail('Order details changed. Review again before booking.');
 if(r.packedRevision&&(await meta<Packed>('dispatch-packed:'+r.reference))?.revision!==r.packedRevision)fail('Order is no longer packed and ready. Review again.');
 const attempt:Booking={provider:r.rate.provider,state:'booking',reviewId:id,reference:r.reference,carrier:r.rate.carrier,startedAt:Date.now()};
 // Durable, per-order exclusion. Never retry a POST /labels after an ambiguous result.
 const claimed=await db.prepare("INSERT OR IGNORE INTO store_meta(key,value) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM store_meta WHERE key=?) AND NOT EXISTS(SELECT 1 FROM store_meta WHERE key=?) AND EXISTS(SELECT 1 FROM orders WHERE reference=? AND payment_status='paid' AND status IN ('paid','processing')) AND (? IS NULL OR EXISTS(SELECT 1 FROM store_meta WHERE key=? AND json_extract(value,'$.revision')=?))").bind(bookingKey(r.reference),JSON.stringify(attempt),'shipbubble-order:'+r.reference,'terminal-order:'+r.reference,r.reference,r.packedRevision||null,'dispatch-packed:'+r.reference,r.packedRevision||null).run();
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
 if(!input.packed){await getDbBinding().prepare('DELETE FROM store_meta WHERE key=? AND NOT EXISTS(SELECT 1 FROM store_meta WHERE key=?)').bind('dispatch-packed:'+input.reference,bookingKey(input.reference)).run();if(await meta<Booking>(bookingKey(input.reference)))fail('Booking has started; packing cannot be changed.');return {packed:false};}
 const value:Packed={revision:crypto.randomUUID(),fingerprint:s.fingerprint,parcel:input.parcel,markedAt:new Date().toISOString(),actor};
 const saved=await getDbBinding().prepare('INSERT INTO store_meta(key,value) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM store_meta WHERE key=?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('dispatch-packed:'+input.reference,JSON.stringify(value),bookingKey(input.reference)).run();if(!saved.meta.changes)fail('Booking has started; packing cannot be changed.');
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
