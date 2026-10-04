import {verifyEmailWebhook,recordEmailEvent} from '@/lib/email-delivery';
export async function POST(request:Request){
 if(Number(request.headers.get('content-length'))>128000)return new Response('Too large',{status:413});
 const raw=await request.text();if(raw.length>128000)return new Response('Too large',{status:413});
 if(!await verifyEmailWebhook(raw,request.headers))return new Response('Invalid signature',{status:401});
 let payload:unknown;try{payload=JSON.parse(raw);}catch{return new Response('Invalid payload',{status:400});}
 try{await recordEmailEvent(payload);return new Response('ok');}catch{return new Response('Unable to record event',{status:500});}
}
