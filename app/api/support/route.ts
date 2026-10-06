import {receiveEnquiry} from '@/lib/customer-support';
export async function POST(request:Request){try{return await receiveEnquiry(request);}catch(e){if(e instanceof SyntaxError)return Response.json({error:'Check the form and try again.'},{status:400});return Response.json({error:'Your enquiry could not be saved. Please try again.'},{status:503});}}
