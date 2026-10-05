import {z} from 'zod';
import {getDbBinding,runtimeEnv} from './runtime-env';
import {pickupConfig} from './terminal-jobs';
import {safeProviderMessage,TERMINAL_SANDBOX} from './terminal-sandbox';
import {NIGERIA_STATES} from './commerce-config';

// This module has no live key, live host or writes to customer orders/payments/emails.
const prefix='terminal-shipping:';
const idSchema=z.string().regex(/^(?:[a-f0-9-]{36}|order-VN-[A-Za-z0-9-]{1,100})$/);
const providerId=z.string().regex(/^[A-Za-z0-9_-]{3,120}$/);
export const deliveryInput=z.object({
 id:z.string().uuid(), reference:z.string().regex(/^VN-[A-Za-z0-9-]{1,100}$/).optional(),
 destination:z.object({city:z.string().trim().min(2).max(100),state:z.string().refine(v=>NIGERIA_STATES.includes(v)),line1:z.string().trim().min(5).max(200),zip:z.string().regex(/^\d{6}$/)}),
 parcel:z.object({weightKg:z.number().min(0.11).max(50),lengthCm:z.number().positive().max(200),widthCm:z.number().positive().max(200),heightCm:z.number().positive().max(200),valueNaira:z.number().positive().max(10000000)}),
});
type Input=z.infer<typeof deliveryInput>;
export type DeliveryRate={id:string;carrier:string;amountKobo:number;delivery:string};
export type DeliverySession={id:string;mode:'sandbox';reference?:string;stage:string;createdAt:string;updatedAt:string;expiresAt?:string;input:Input;rates:DeliveryRate[];selected?:DeliveryRate;shipmentId?:string;tracking?:{status:string;number:string;url:string;checkedAt:string;events:Array<{status:string;at:string}>};error?:string};
export class DeliveryError extends Error{constructor(message:string,readonly ambiguous=false){super(message);}}
function testKey(){const key=runtimeEnv().TERMINAL_AFRICA_TEST_SECRET_KEY?.trim();if(!key)throw new DeliveryError('Terminal test secret is not configured.');return key;}
export async function deliveryRequest(path:string,body?:unknown,send:typeof fetch=fetch){
 const allowed=body!==undefined?['/packaging','/rates/shipment/quotes','/shipments/pickup'].includes(path):/^\/(?:rates|shipments\/track)\/[A-Za-z0-9_-]{3,120}$/.test(path);
 if(!allowed)throw new DeliveryError('Sandbox operation not allowed.');
 const key=testKey();let response:Response;let payload:any;
 try{response=await send(TERMINAL_SANDBOX+path,{method:body===undefined?'GET':'POST',redirect:'manual',signal:AbortSignal.timeout(25000),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});payload=await response.json();}catch{throw new DeliveryError('Terminal did not return a readable response. Check the sandbox dashboard before retrying a booking.',true);}
 if(!response.ok||payload?.status!==true)throw new DeliveryError(`Terminal HTTP ${response.status}: ${safeProviderMessage(payload,key,body)}`,response.status>=500||response.status<400);
 return payload.data;
}
function parseRates(data:any):DeliveryRate[]{if(!Array.isArray(data))throw new DeliveryError('Terminal returned an unexpected rates format.');return data.filter((r:any)=>providerId.safeParse(r.rate_id).success&&typeof r.carrier_name==='string'&&r.currency==='NGN'&&Number.isFinite(r.amount)&&r.amount>0&&r.amount<=10000000&&!r.dropoff_required).slice(0,30).map((r:any)=>({id:r.rate_id,carrier:r.carrier_name.slice(0,100),amountKobo:Math.round(r.amount*100),delivery:typeof r.delivery_time==='string'?r.delivery_time.slice(0,160):'Not supplied'}));}
export function parseTracking(data:any){if(!data||typeof data.status!=='string')throw new DeliveryError('Terminal returned an unexpected tracking format.');let url='';const raw=data.extras?.tracking_url;try{const u=new URL(raw);if(u.protocol==='https:'&&!u.username&&!u.password)url=u.href;}catch{}
 return {status:data.status.slice(0,80),number:String(data.carrier_tracking_number||data.extras?.tracking_number||'').slice(0,160),url,checkedAt:new Date().toISOString(),events:(Array.isArray(data.events)?data.events:[]).slice(-20).map((e:any)=>({status:typeof e.status==='string'?e.status.slice(0,80):'update',at:typeof e.created_at==='string'?e.created_at.slice(0,40):''}))};}
async function read(id:string){idSchema.parse(id);const row=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind(prefix+id).first<{value:string}>();return row?{raw:row.value,session:JSON.parse(row.value) as DeliverySession}:null;}
export async function deliverySession(id:string){return (await read(id))?.session||null;}
export async function recentDeliverySessions(reference?:string){if(reference)return [await deliverySession('order-'+reference)].filter(Boolean);const r=await getDbBinding().prepare("SELECT value FROM store_meta WHERE key LIKE 'terminal-shipping:%' ORDER BY json_extract(value,'$.createdAt') DESC LIMIT 15").all<{value:string}>();return r.results.map(v=>JSON.parse(v.value) as DeliverySession);}
async function cas(id:string,old:string,value:DeliverySession){const r=await getDbBinding().prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(JSON.stringify({...value,updatedAt:new Date().toISOString()}),prefix+id,old).run();return r.meta.changes>0;}
async function eligible(reference?:string){if(!reference)return;const o=await getDbBinding().prepare('SELECT payment_status,status FROM orders WHERE reference=?').bind(reference).first<{payment_status:string;status:string}>();if(!o||o.payment_status!=='paid'||!['paid','processing'].includes(o.status))throw new DeliveryError('Only paid, unshipped orders can run this delivery test.');}
export async function quoteDelivery(raw:unknown){
 const input=deliveryInput.parse(raw);testKey();await eligible(input.reference);const id=input.reference?'order-'+input.reference:input.id;
 const now=new Date().toISOString();const s:DeliverySession={id,mode:'sandbox',reference:input.reference,stage:'quoting',createdAt:now,updatedAt:now,input,rates:[]};
 const existing=await read(id);if(existing){if(!['quoted','quote_failed'].includes(existing.session.stage)&&!(existing.session.stage==='quoting'&&Date.now()-Date.parse(existing.session.updatedAt)>180000))return existing.session;if(!await cas(id,existing.raw,s))return (await deliverySession(id))!;}else{const insert=await getDbBinding().prepare('INSERT OR IGNORE INTO store_meta(key,value) VALUES(?,?)').bind(prefix+id,JSON.stringify(s)).run();if(!insert.meta.changes)return (await deliverySession(id))!;}
 const claimed=await read(id);if(!claimed)throw new DeliveryError('Sandbox session could not be stored.');
 try{
 const savedPickup=await pickupConfig();const pickup={...savedPickup,line2:savedPickup.city};const packaging=await deliveryRequest('/packaging',{name:'Vanta Noir clothing parcel',type:'box',length:input.parcel.lengthCm,width:input.parcel.widthCm,height:input.parcel.heightCm,size_unit:'cm',weight:0.1,weight_unit:'kg'});
 const packagingId=providerId.parse(packaging?.packaging_id);
 // Reuse the explicitly supplied test contact; never transmit an order customer's contact.
 const address={...pickup,...input.destination,line2:input.destination.city,state:input.destination.state==='FCT'?'Abuja':input.destination.state,country:'NG'};
 const data=await deliveryRequest('/rates/shipment/quotes',{pickup_address:pickup,delivery_address:address,parcel:{description:'Clothing',packaging:packagingId,weight_unit:'kg',items:[{name:'Clothing',description:'Clothing',currency:'NGN',value:input.parcel.valueNaira,weight:Math.round((input.parcel.weightKg-0.1)*100000)/100000,quantity:1}]},currency:'NGN',cash_on_delivery:false,persist_data:true});
 s.rates=parseRates(data);s.stage=s.rates.length?'quoted':'quote_failed';s.expiresAt=new Date(Date.now()+15*60*1000).toISOString();if(!s.rates.length)s.error='No supported door-to-door rates are available. This is not free delivery.';
 }catch(e){s.stage='quote_failed';s.error=e instanceof DeliveryError?e.message:'Check the destination and parcel details, then request new quotes.';}
 await cas(id,claimed.raw,s);return (await deliverySession(id))!;
}
export async function bookDelivery(id:string,rateId:string,expectedKobo:number,confirmed:boolean){
 if(confirmed!==true)throw new DeliveryError('Confirm the displayed courier and test price first.');const record=await read(id);if(!record)throw new DeliveryError('Quote not found.');const s=record.session;
 if(s.stage!=='quoted')return s;
 await eligible(s.reference);if(!s.expiresAt||Date.parse(s.expiresAt)<=Date.now())throw new DeliveryError('Quote expired. Request fresh quotes.');
 const rate=s.rates.find(r=>r.id===rateId);if(!rate||rate.amountKobo!==expectedKobo)throw new DeliveryError('The selected quote or amount changed. Refresh quotes.');
 const locked:DeliverySession={...s,stage:'booking',selected:rate,error:undefined};if(!await cas(id,record.raw,locked))return (await deliverySession(id))!;
 const current=await read(id);if(!current)throw new DeliveryError('Booking lock unavailable.');
 let attempted=false;
 try{
 // Validate the persisted provider rate immediately before booking; never accept client prices.
 const fresh=await deliveryRequest('/rates/'+providerId.parse(rate.id));
 if(fresh?.rate_id!==rate.id||fresh?.currency!=='NGN'||Math.round(fresh?.amount*100)!==rate.amountKobo||fresh?.used===true)throw new DeliveryError('Terminal quote changed or was used. Request fresh quotes.');
 await eligible(s.reference);attempted=true;
 const result=await deliveryRequest('/shipments/pickup',{rate_id:rate.id,purchase_insurance:false});
 locked.shipmentId=providerId.parse(result?.shipment_id);locked.tracking=parseTracking(result);locked.stage='booked';
 }catch(e){locked.stage=attempted?'needs_review':'quoted';locked.error=(e instanceof DeliveryError?e.message:'Terminal booking response could not be verified.')+(attempted?' Booking is locked to prevent duplicates. Check Terminal sandbox before any further action.':'');}
 await cas(id,current.raw,locked);return (await deliverySession(id))!;
}
export async function refreshDeliveryTracking(id:string){const r=await read(id);if(!r)throw new DeliveryError('Sandbox shipment not found.');const s=r.session;if(!s.shipmentId)throw new DeliveryError('There is no confirmed sandbox shipment to track.');const data=await deliveryRequest('/shipments/track/'+providerId.parse(s.shipmentId));if(data?.shipment_id!==s.shipmentId)throw new DeliveryError('Tracking response does not match the shipment.');const next=parseTracking(data);if(s.tracking?.status==='delivered'&&next.status!=='delivered')return s;s.tracking={...next,url:next.url||s.tracking?.url||'',number:next.number||s.tracking?.number||''};await cas(id,r.raw,s);return (await deliverySession(id))!;}
