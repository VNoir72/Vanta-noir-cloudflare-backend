/** Quote-only sandbox comparison. No live credentials or booking endpoints. */
export type ComparisonRate = {
  provider: 'terminal' | 'shipbubble'; id: string; carrier: string; service: string;
  amountKobo: number; walletKobo: number; currency: 'NGN'; delivery: string;
};
type ObjectValue = Record<string, unknown>;
const object = (v: unknown): ObjectValue => v && typeof v === 'object' && !Array.isArray(v) ? v as ObjectValue : {};
const label = (v: unknown, max = 160) => typeof v === 'string' ? v.slice(0, max) : '';
const identifier = (v: unknown) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(v) ? v : '';
function kobo(v: unknown) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > 10_000_000) return null;
  return Math.round(v * 100);
}
export function terminalRates(data: unknown, quoteOnly=false): ComparisonRate[] {
  if (!Array.isArray(data)) throw Error('Terminal returned an unexpected rates format.');
  return data.slice(0,100).flatMap((value,index) => {
    const r=object(value),amount=kobo(r.amount),id=identifier(r.rate_id)||(quoteOnly?`quote-only-${index}`:'');
    if (!id || amount===null || r.currency!=='NGN' || !label(r.carrier_name) || r.dropoff_required===true || r.type==='cargo') return [];
    return [{provider:'terminal' as const,id,carrier:label(r.carrier_name,100),service:label(r.carrier_rate_description),amountKobo:amount,walletKobo:amount,currency:'NGN' as const,delivery:label(r.delivery_time)||'Estimate unavailable'}];
  });
}
export function shipbubbleRates(data: unknown): ComparisonRate[] {
  const body=object(data),token=identifier(body.request_token);
  if (!token || !Array.isArray(body.couriers)) throw Error('Shipbubble returned an unexpected rates format.');
  return body.couriers.slice(0,100).flatMap(value=>{
    const r=object(value),wallet=kobo(r.total),amount=kobo(r.rate_card_amount ?? r.total),id=identifier(r.service_code);
    if (!id || amount===null || wallet===null || !['NGN','₦'].includes(String(r.currency)) || !label(r.courier_name) || r.service_type!=='pickup' || r.pickup_station || r.dropoff_station) return [];
    return [{provider:'shipbubble' as const,id:token+':'+id,carrier:label(r.courier_name,100),service:id,amountKobo:amount,walletKobo:wallet,currency:'NGN' as const,delivery:label(r.delivery_eta)||'Estimate unavailable'}];
  });
}
export async function compareRates(terminal:()=>Promise<ComparisonRate[]>,shipbubble:()=>Promise<ComparisonRate[]>) {
  const providers=['terminal','shipbubble'] as const;
  const replies=await Promise.allSettled([Promise.resolve().then(terminal),Promise.resolve().then(shipbubble)]);
  const status=replies.map((reply,i)=>({provider:providers[i],status:reply.status==='rejected'?'error':reply.value.length?'quoted':'unavailable',...(reply.status==='rejected'?{error:safeFailure(reply.reason)}:{})}));
  const rates=replies.flatMap(r=>r.status==='fulfilled'?r.value:[]).sort((a,b)=>a.amountKobo-b.amountKobo||a.provider.localeCompare(b.provider)||a.id.localeCompare(b.id));
  // Keep distinct services visible; a courier name alone does not establish equivalent coverage, duties or speed.
  return {mode:'sandbox' as const,bookingEnabled:false as const,checkoutEnabled:false as const,rates,providers:status,partial:status.some(s=>s.status==='error'),cheapest:rates[0]?{provider:rates[0].provider,id:rates[0].id}:null};
}
function safeFailure(reason:unknown){
 const message=reason instanceof Error?reason.message:'';
 if(/^Shipping provider HTTP [1-5][0-9]{2}\.$/.test(message))return message;
 const allowed=['A Shipbubble sandbox key is required.','Terminal sandbox key is required.','Shipping provider timed out or could not be reached.','Shipbubble did not validate both addresses.','Shipbubble clothing category is unavailable.','Terminal sandbox packaging was not accepted.','Shipping provider rejected the request.'];
 return allowed.includes(message)?message:'Provider response could not be verified.';
}
export async function providerJson(url:string,key:string,body:unknown,send:typeof fetch=fetch) {
  let response:Response;
  try { response=await send(url,{method:body===undefined?'GET':'POST',redirect:'manual',signal:AbortSignal.timeout(12000),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}); }
  catch { throw Error('Shipping provider timed out or could not be reached.'); }
  if (!response.ok) {await response.body?.cancel();throw Error(`Shipping provider HTTP ${response.status}.`);}
  const reader=response.body?.getReader();if(!reader)throw Error('Empty provider response.');
  let text='',size=0;const decoder=new TextDecoder();
  try {while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>512_000)throw Error('Provider response exceeded the size limit.');text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}
  finally {await reader.cancel().catch(()=>{});}
  let parsed:unknown;try{parsed=JSON.parse(text);}catch{throw Error('Unreadable provider response.');}
  const payload=object(parsed);
  if(payload.status!==true&&payload.status!=='success')throw Error('Shipping provider rejected the request.');
  return payload.data;
}
export type TestAddress={first_name:string;last_name:string;email:string;phone:string;line1:string;city:string;state:string;country:string;zip:string};
export type TestParcel={weightKg:number;lengthCm:number;widthCm:number;heightCm:number;valueNaira:number};
export async function shipbubbleSandbox(key:string,pickup:TestAddress,destination:TestAddress,parcel:TestParcel,send:typeof fetch=fetch){
  if(!key.trim().startsWith('sb_sandbox_'))throw Error('A Shipbubble sandbox key is required.');
  const request=(path:string,body?:unknown)=>providerJson('https://api.shipbubble.com/v1/shipping/'+path,key.trim(),body,send);
  const address=(a:TestAddress)=>request('address/validate',{name:`${a.first_name} ${a.last_name}`,email:a.email,phone:a.phone,address:[a.line1,a.city,a.state,a.zip,'Nigeria'].join(', ')});
  const [from,to,categories]=await Promise.all([address(pickup),address(destination),request('labels/categories')]);
  const sender=object(from).address_code,receiver=object(to).address_code;
  if(!Number.isSafeInteger(sender)||!Number.isSafeInteger(receiver))throw Error('Shipbubble did not validate both addresses.');
  const category=Array.isArray(categories)?categories.map(object).find(c=>typeof c.category==='string'&&/^fashion wears$/i.test(c.category)):undefined;
  if(!category||!Number.isSafeInteger(category.category_id))throw Error('Shipbubble clothing category is unavailable.');
  // Both provider quotes use the same total packed weight and external dimensions.
  const data=await request('fetch_rates',{sender_address_code:sender,reciever_address_code:receiver,category_id:category.category_id,pickup_date:new Date(Date.now()+86400000).toISOString().slice(0,10),service_type:'pickup',package_items:[{name:'Sandbox clothing',description:'Synthetic test parcel',unit_weight:parcel.weightKg,unit_amount:parcel.valueNaira,quantity:1}],package_dimension:{length:parcel.lengthCm,width:parcel.widthCm,height:parcel.heightCm}});
  return shipbubbleRates(data);
}
export async function terminalSandbox(key:string,pickup:TestAddress,destination:TestAddress,parcel:TestParcel,send:typeof fetch=fetch){
  if(!key.trim())throw Error('Terminal sandbox key is required.');
  const request=(path:string,body:unknown)=>providerJson('https://sandbox.terminal.africa/v1'+path,key.trim(),body,send);
  const packaging=object(await request('/packaging',{name:'Vanta Noir comparison QA',type:'box',length:parcel.lengthCm,width:parcel.widthCm,height:parcel.heightCm,size_unit:'cm',weight:0.1,weight_unit:'kg'}));
  const id=identifier(packaging.packaging_id);if(!id)throw Error('Terminal sandbox packaging was not accepted.');
  const data=await request('/rates/shipment/quotes',{pickup_address:pickup,delivery_address:destination,parcel:{description:'Synthetic clothing parcel',packaging:id,weight_unit:'kg',items:[{name:'Sandbox clothing',description:'Synthetic test parcel',currency:'NGN',value:parcel.valueNaira,weight:Math.round((parcel.weightKg-0.1)*100000)/100000,quantity:1}]},currency:'NGN',cash_on_delivery:false,persist_data:false});
  // Non-persisted sandbox quotes can omit rate_id. Display-only IDs must never be booked.
  return terminalRates(data,true);
}
