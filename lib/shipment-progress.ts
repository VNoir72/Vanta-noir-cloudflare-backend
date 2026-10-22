import {z} from 'zod';
import {getDbBinding,runtimeEnv} from './runtime-env';
import {providerJson} from './shipping-comparison';

export const shipmentSchema=z.object({
 order_id:z.string().regex(/^SB-[A-Za-z0-9-]{1,100}$/),
 status:z.enum(['pending','confirmed','picked_up','in_transit','completed','cancelled']),
 courier:z.object({name:z.string().trim().min(1).max(100),tracking_code:z.string().max(160).nullable().optional()}),
 events:z.array(z.object({location:z.string().max(300).nullish(),message:z.string().max(500),captured:z.string().max(100).nullish()})).max(200).optional().catch(undefined),
 package_status:z.array(z.object({status:z.string().max(50),datetime:z.string().max(100).nullish()})).max(100).optional().catch(undefined)
});
export type Shipment=z.infer<typeof shipmentSchema>;
export type Progress={shipmentId:string;status:Shipment['status'];carrier:string;observedAt:string;changedAt:string;activityAt?:string;rank:number;events:Array<{message:string;location:string;at:string|null}>;timeline:Array<{status:string;at:string}>};
const ranks={pending:0,confirmed:1,picked_up:2,in_transit:3,completed:4,cancelled:5};
export function trackingUrl(reference:string){return new URL('/help-center?reference='+encodeURIComponent(reference)+'#track-order',runtimeEnv().STOREFRONT_URL||'https://vantanoir.store').href;}
const clean=(s:string)=>s.replace(/[\u0000-\u001f\u007f]/g,' ').trim();
function timestamp(value?:string|null){if(!value)return null;const t=Date.parse(value);return Number.isFinite(t)&&t<=Date.now()+300000?new Date(t).toISOString():null;}
export async function shipmentProgress(reference:string){const r=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind('shipment-progress:'+reference).first<{value:string}>();return r?JSON.parse(r.value) as Progress:null;}
export async function saveShipmentProgress(reference:string,s:Shipment,retry=0):Promise<void>{
 const db=getDbBinding(),previous=await shipmentProgress(reference),now=new Date().toISOString();
 const same=previous?.shipmentId===s.order_id;
 // Delivered is terminal; an older pickup or cancellation must not regress it.
 if(same&&((previous.status==='completed'&&s.status!=='completed')||(s.status!=='cancelled'&&previous.status!=='cancelled'&&ranks[s.status]<previous.rank)))return;
 const suppliedAt=timestamp(s.package_status?.findLast(p=>p.status===s.status)?.datetime);
 if(same&&previous.status==='cancelled'&&s.status!=='completed'&&s.status!=='cancelled'&&(!suppliedAt||suppliedAt<=previous.changedAt))return;
 if(same&&suppliedAt&&suppliedAt<previous.changedAt&&s.status!=='completed')return;
 const changedAt=same&&previous.status===s.status?previous.changedAt:suppliedAt||now;
 const incoming=(s.events||[]).map(e=>({message:clean(e.message),location:clean(e.location||''),at:timestamp(e.captured)}));
 const events=[...(same?previous.events:[]),...incoming].filter((e,i,all)=>all.findIndex(v=>v.message===e.message&&v.at===e.at&&v.location===e.location)===i).slice(-40);
 const timeline=[...(same?previous.timeline:[]),...(!same||previous.status!==s.status?[{status:s.status,at:changedAt}]:[])].slice(-20);
 const newEvents=incoming.filter(e=>!same||!previous.events.some(v=>v.message===e.message&&v.at===e.at&&v.location===e.location));
 const activityAt=[changedAt,...(same?[previous.activityAt||previous.changedAt]:[]),...newEvents.map(e=>e.at||now)].sort().at(-1)!;
 const progress:Progress={shipmentId:s.order_id,status:s.status,carrier:clean(s.courier.name),observedAt:now,changedAt,activityAt,rank:ranks[s.status],events,timeline};
 // Compare the exact previous snapshot so simultaneous deliveries cannot overwrite a newer state.
 const prior=previous?JSON.stringify(previous):null;
 const saved=prior?await db.prepare('UPDATE store_meta SET value=? WHERE key=? AND value=?').bind(JSON.stringify(progress),'shipment-progress:'+reference,prior).run():await db.prepare('INSERT OR IGNORE INTO store_meta(key,value) VALUES(?,?)').bind('shipment-progress:'+reference,JSON.stringify(progress)).run();
 if(!saved.meta.changes){if(retry>=3)throw Error('Concurrent tracking update; retry delivery.');await saveShipmentProgress(reference,s,retry+1);}
}
export async function readProviderShipment(id:string){
 z.string().regex(/^SB-[A-Za-z0-9-]{1,100}$/).parse(id);
 const key=runtimeEnv().SHIPBUBBLE_API_KEY||'';if(!key.startsWith('sb_prod_'))throw Error('Live shipping connection unavailable.');
 const data=await providerJson('https://api.shipbubble.com/v1/shipping/labels/list/'+encodeURIComponent(id),key,undefined) as {results?:unknown[]};
 const shipment=shipmentSchema.parse(data.results?.find(v=>z.object({order_id:z.string()}).safeParse(v).data?.order_id===id));
 return shipment;
}
