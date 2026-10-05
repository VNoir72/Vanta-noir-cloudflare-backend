/** Sandbox only. No shipment creation, booking, payment or live-host capability. */
export const TERMINAL_SANDBOX = 'https://sandbox.terminal.africa/v1';
export type QuoteResult={destination:string;status:'quoted'|'unavailable'|'rejected'|'error';httpStatus?:number;rates:Array<{carrier:string;amount:number;currency:string;delivery:string}>;message?:string};
export const destinations=[
 {label:'Lagos — Ikeja',city:'Ikeja',state:'Lagos',line1:'1 Allen Avenue',zip:'100271'},
 {label:'Abuja — Wuse',city:'Abuja',state:'Abuja',line1:'1 Adetokunbo Ademola Crescent, Wuse II',zip:'900288'},
 {label:'Kaduna — Barnawa',city:'Kaduna',state:'Kaduna',line1:'2 Gwari Avenue, Barnawa',zip:'800242'},
 {label:'Port Harcourt',city:'Port Harcourt',state:'Rivers',line1:'1 Aba Road',zip:'500211'},
 {label:'Invalid destination (negative test)',city:'INVALID_TEST_CITY',state:'INVALID_TEST_STATE',line1:'Synthetic invalid address',zip:'INVALID'}
];
export function inchesToCm(n:number){if(!Number.isFinite(n)||n<=0||n>200)throw new Error('Invalid package measurement');return Math.round(n*254)/100;}
export async function sandboxRequest(key:string,path:'/packaging'|'/rates/shipment/quotes',body:unknown,send:typeof fetch=fetch){
 if(!key?.trim())throw new Error('Test secret is missing');
 if(!['/packaging','/rates/shipment/quotes'].includes(path))throw new Error('Sandbox operation not allowed');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
 try{const response=await send(TERMINAL_SANDBOX+path,{method:'POST',redirect:'manual',signal:controller.signal,headers:{Authorization:`Bearer ${key.trim()}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const payload=await response.json().catch(()=>null) as any;
 return {httpStatus:response.status,ok:response.ok&&payload?.status===true,data:payload?.data};
 }finally{clearTimeout(timer);}
}
export async function runSandboxQuotes(key:string,pickup:Record<string,string>,send:typeof fetch=fetch):Promise<{mode:'sandbox';bookingEnabled:false;results:QuoteResult[];completedAt:string}>{
 const results:QuoteResult[]=[];
 // Total packed weight is 5kg: synthetic contents 4.9kg + synthetic packaging 0.1kg.
 const packaging=await sandboxRequest(key,'/packaging',{name:'Vanta Noir sandbox QA 21x12x5 inches',type:'box',length:inchesToCm(21),width:inchesToCm(12),height:inchesToCm(5),size_unit:'cm',weight:0.1,weight_unit:'kg'},send);
 if(!packaging.ok||typeof packaging.data?.packaging_id!=='string')throw new Error(`Terminal sandbox packaging request failed (HTTP ${packaging.httpStatus}). Check test credentials/account availability.`);
 for(const d of destinations){
 try{
 const reply=await sandboxRequest(key,'/rates/shipment/quotes',{
 pickup_address:pickup,
 delivery_address:{city:d.city,state:d.state,country:'NG',line1:d.line1,zip:d.zip,first_name:'Sandbox',last_name:'Recipient',email:'recipient@example.com'},
 parcel:{description:'Synthetic clothing parcel — sandbox only',packaging:packaging.data.packaging_id,weight_unit:'kg',items:[{name:'Test clothing',description:'Synthetic test item',currency:'NGN',value:10000,weight:4.9,quantity:1}]},currency:'NGN',persist_data:false,cash_on_delivery:false
 },send);
 if(!reply.ok){results.push({destination:d.label,status:reply.httpStatus>=400&&reply.httpStatus<500?'rejected':'error',httpStatus:reply.httpStatus,rates:[],message:'Provider did not return a successful quote.'});continue;}
 if(!Array.isArray(reply.data)){results.push({destination:d.label,status:'error',httpStatus:reply.httpStatus,rates:[],message:'Provider returned an unexpected quote format.'});continue;}
 const rates=reply.data.filter((r:any)=>typeof r.amount==='number'&&Number.isFinite(r.amount)&&r.amount>0&&r.currency==='NGN'&&typeof r.carrier_name==='string').slice(0,30).map((r:any)=>({carrier:r.carrier_name.slice(0,100),amount:r.amount,currency:'NGN',delivery:typeof r.delivery_time==='string'?r.delivery_time.slice(0,160):'Not supplied'}));
 results.push({destination:d.label,status:rates.length?'quoted':'unavailable',httpStatus:reply.httpStatus,rates,message:d.state==='INVALID_TEST_STATE'&&rates.length?'Sandbox returned rates for invalid data; do not treat sandbox rates as address validation.':undefined});
 }catch{results.push({destination:d.label,status:'error',rates:[],message:'Sandbox request timed out or could not be read. No booking was attempted.'});}
 }
 return {mode:'sandbox',bookingEnabled:false,results,completedAt:new Date().toISOString()};
}
