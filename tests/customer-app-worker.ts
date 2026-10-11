import {experienceFetch} from '../worker/app-experience-overlay';
import {startSavedCardPayment} from '../lib/customer-cards';
import {POST as checkout} from '../app/api/checkout/route';
import {customerApp} from '../lib/customer-app';
import {startTransferPayment} from '../lib/custom-transfer';
export default {async fetch(request:Request){const experience=await experienceFetch(request);if(experience)return experience;if(new URL(request.url).pathname==='/api/checkout')return checkout(request);if(new URL(request.url).pathname==='/saved-card'){const v=await request.json() as {reference:string;receiptToken:string;owner:string;id:string};try{return Response.json(await startSavedCardPayment(v.reference,v.receiptToken,v.owner,v.id));}catch{return Response.json({error:'Unavailable'},{status:400});}}if(new URL(request.url).pathname==='/transfer'){const v=await request.json() as {reference:string;receiptToken:string};return Response.json(await startTransferPayment(v.reference,v.receiptToken))}return customerApp(request)}};
