import {customerApp} from '../lib/customer-app';
import {startTransferPayment} from '../lib/custom-transfer';
export default {async fetch(request:Request){if(new URL(request.url).pathname==='/transfer'){const v=await request.json() as {reference:string;receiptToken:string};return Response.json(await startTransferPayment(v.reference,v.receiptToken))}return customerApp(request)}};
