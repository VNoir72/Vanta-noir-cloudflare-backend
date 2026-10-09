import {z} from 'zod';
import {getDbBinding,runtimeEnv} from './runtime-env';
import {getPickupDetails} from './terminal-pickup';
import {shipbubbleQuote} from './shipping-comparison';
const referenceSchema=z.string().regex(/^VN-[A-Za-z0-9_-]{1,100}$/);
const dimensions=z.coerce.number().finite().positive().max(200);
export const orderMeasurementsSchema=z.object({weightKg:z.coerce.number().finite().positive().max(50),lengthCm:dimensions,widthCm:dimensions,heightCm:dimensions});
export type Measurements=z.infer<typeof orderMeasurementsSchema>;
type Saved={revision:string;updatedAt:string;measurements:Measurements};
const key=(reference:string)=>'order-measurements:'+reference;
export async function orderMeasurements(reference:string){
 referenceSchema.parse(reference);
 const row=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind(key(reference)).first<{value:string}>();
 return row?JSON.parse(row.value) as Saved:null;
}
export async function measurementOrders(){return (await getDbBinding().prepare("SELECT reference,city,state,shipping_kobo AS shippingKobo FROM orders WHERE payment_status='paid' AND status IN ('paid','processing') ORDER BY created_at DESC LIMIT 100").all<{reference:string;city:string;state:string;shippingKobo:number}>()).results;}
export async function saveOrderMeasurements(reference:string,input:unknown,revision:unknown,actor:string){
 referenceSchema.parse(reference);const measurements=orderMeasurementsSchema.parse(input),expected=z.string().uuid().nullable().parse(revision);
 const db=getDbBinding(),record:Saved={revision:crypto.randomUUID(),updatedAt:new Date().toISOString(),measurements};
 const eligible="EXISTS(SELECT 1 FROM orders WHERE reference=? AND payment_status='paid' AND status IN ('paid','processing')) AND NOT EXISTS(SELECT 1 FROM store_meta WHERE key=?) AND NOT EXISTS(SELECT 1 FROM store_meta WHERE key=?)";
 const result=expected===null
 ?await db.prepare(`INSERT OR IGNORE INTO store_meta(key,value) SELECT ?,? WHERE ${eligible}`).bind(key(reference),JSON.stringify(record),reference,'shipbubble-order:'+reference,'dispatch-booking:'+reference).run()
 :await db.prepare(`UPDATE store_meta SET value=? WHERE key=? AND json_extract(value,'$.revision')=? AND ${eligible}`).bind(JSON.stringify(record),key(reference),expected,reference,'shipbubble-order:'+reference,'dispatch-booking:'+reference).run();
 if(!result.meta.changes)throw Error('Measurements were not saved. Reload the order; it may have changed, shipped, or already been linked.');
 await db.prepare('INSERT INTO admin_audit(actor,action,entity,detail) VALUES(?,?,?,?)').bind(actor,'order.measurements',reference,JSON.stringify(record)).run();
 return record;
}
export async function quoteMeasuredOrder(reference:string,revision:string){
 referenceSchema.parse(reference);const db=getDbBinding(),saved=await orderMeasurements(reference);
 if(!saved||saved.revision!==revision)throw Error('Save and reload the actual packed measurements before requesting rates.');
 const order=await db.prepare("SELECT first_name,last_name,email,phone,address_line_1,address_line_2,city,state,country,subtotal_kobo,shipping_kobo FROM orders WHERE reference=? AND payment_status='paid' AND status IN ('paid','processing')").bind(reference).first<{first_name:string;last_name:string;email:string;phone:string;address_line_1:string;address_line_2:string;city:string;state:string;country:string;subtotal_kobo:number;shipping_kobo:number}>();
 if(!order||!['NG','Nigeria'].includes(order.country))throw Error('Choose a paid, unshipped Nigerian order.');
 if(await db.prepare('SELECT key FROM store_meta WHERE key=?').bind('shipbubble-order:'+reference).first())throw Error('This order already has a linked shipment.');
 const pickup=await getPickupDetails();if(!pickup)throw Error('Save the business pickup address first.');
 const rates=await shipbubbleQuote(runtimeEnv().SHIPBUBBLE_API_KEY||'',{...pickup.details,line1:[pickup.details.line1,pickup.details.line2].filter(Boolean).join(', ')},{first_name:order.first_name,last_name:order.last_name,email:order.email,phone:order.phone,line1:[order.address_line_1,order.address_line_2].filter(Boolean).join(', '),city:order.city,state:order.state,country:'NG',zip:''},{...saved.measurements,valueNaira:order.subtotal_kobo/100},'live');
 if((await orderMeasurements(reference))?.revision!==revision)throw Error('Measurements changed while fetching rates. Reload and request fresh rates.');
 return {rates:rates.sort((a,b)=>a.amountKobo-b.amountKobo),shippingKobo:order.shipping_kobo,quotedAt:new Date().toISOString()};
}
