import {z} from 'zod';
import {getDbBinding,runtimeEnv} from './runtime-env';
import {terminalRates,type ComparisonRate,type TestAddress,type TestParcel} from './shipping-comparison';
import {verifyLiveCredential} from './terminal-live';
const providerId=z.string().regex(/^[A-Za-z0-9_-]{3,120}$/);
export async function terminalDispatchReady(){
 const row=await getDbBinding().prepare("SELECT json_extract(value,'$.status') AS status,json_extract(value,'$.authenticated') AS authenticated,json_extract(value,'$.walletActive') AS active,json_extract(value,'$.walletEnabled') AS enabled FROM store_meta WHERE key='terminal_live_connection'").first<{status:string;authenticated:number;active:number;enabled:number}>();
 return !!runtimeEnv().TERMINAL_AFRICA_LIVE_SECRET_KEY?.trim()&&row?.status==='connected'&&row.authenticated===1&&row.active===1&&row.enabled===1;
}
export async function terminalRequest(path:string,body?:unknown){
 if(!(['/packaging','/rates/shipment/quotes','/shipments/pickup'].includes(path)||/^\/rates\/[A-Za-z0-9_-]{3,120}$/.test(path)))throw Error('Unsupported Terminal operation.');
 const key=runtimeEnv().TERMINAL_AFRICA_LIVE_SECRET_KEY?.trim();if(!key||!await terminalDispatchReady())throw Error('Terminal live wallet is not ready for booking.');
 let response:Response;let payload:any;
 try{response=await fetch('https://api.terminal.africa/v1'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},redirect:'manual',signal:AbortSignal.timeout(25000),...(body===undefined?{}:{body:JSON.stringify(body)})});payload=await response.json();}catch{throw Error('Terminal response could not be verified.');}
 if(!response.ok||payload?.status!==true)throw Error('Terminal request was not accepted.');
 return payload.data;
}
export async function terminalLiveQuotes(pickup:TestAddress,destination:TestAddress,parcel:TestParcel,tareKg:number){
 if(!await terminalDispatchReady())throw Error('Terminal live wallet is not ready for booking.');
 if(!pickup.zip||!destination.zip)throw Error('Terminal needs the pickup and destination postal codes.');
 if(!(tareKg>0&&parcel.weightKg>tareKg))throw Error('Packed weight must exceed the packaging allowance.');
 const packaging=await terminalRequest('/packaging',{name:'Vanta Noir approved parcel',type:'box',length:parcel.lengthCm,width:parcel.widthCm,height:parcel.heightCm,size_unit:'cm',weight:tareKg,weight_unit:'kg'});
 const packagingId=providerId.parse(packaging?.packaging_id);
 const data=await terminalRequest('/rates/shipment/quotes',{pickup_address:pickup,delivery_address:destination,parcel:{description:'Packed clothing order',packaging:packagingId,weight_unit:'kg',items:[{name:'Clothing order',description:'Garments and inner wrapping',currency:'NGN',value:parcel.valueNaira,weight:Math.round((parcel.weightKg-tareKg)*100000)/100000,quantity:1}]},currency:'NGN',cash_on_delivery:false,persist_data:true});
 return terminalRates(data);
}
export async function terminalPreflight(rate:ComparisonRate){
 const flags=await verifyLiveCredential(runtimeEnv().TERMINAL_AFRICA_LIVE_SECRET_KEY||'');
 if(!flags.walletActive||!flags.walletEnabled)throw Error('Terminal live wallet is not active.');
 const raw=await terminalRequest('/rates/'+providerId.parse(rate.id));const fresh=terminalRates([raw])[0];
 if(!fresh||raw.used===true||fresh.id!==rate.id||fresh.walletKobo!==rate.walletKobo||fresh.carrier!==rate.carrier||fresh.service!==rate.service)throw Error('Terminal rate changed or was used. Review again.');
}
export async function terminalBook(rate:ComparisonRate){return terminalRequest('/shipments/pickup',{rate_id:providerId.parse(rate.id),purchase_insurance:false});}
export function terminalBooked(raw:unknown,email:string){
 const shipment=z.object({shipment_id:providerId,status:z.enum(['confirmed','pending','in-transit','delivered']),address_to:z.object({email:z.string().email()}),extras:z.object({tracking_url:z.string().optional(),tracking_number:z.string().optional()}).passthrough().optional(),carrier_tracking_number:z.string().optional()}).parse(raw);
 if(shipment.address_to.email.toLowerCase()!==email.toLowerCase())throw Error('Recipient mismatch');
 return {shipmentId:shipment.shipment_id,trackingUrl:shipment.extras?.tracking_url||'',trackingNumber:shipment.carrier_tracking_number||shipment.extras?.tracking_number||shipment.shipment_id};
}
