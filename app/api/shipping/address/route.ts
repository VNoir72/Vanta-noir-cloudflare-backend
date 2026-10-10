import {validatedShippingAddress} from '@/lib/shipping-address';
import {rateLimit} from '@/lib/commerce-db';
export async function POST(request:Request){
 if(!await rateLimit(request,'shipping-address',20,600))return Response.json({error:'Please wait before checking your address again.'},{status:429});
 try{const raw=await request.text();if(raw.length>4000)throw Error();const v=JSON.parse(raw);const data=await validatedShippingAddress(v);return Response.json({postalCode:data.postalCode,city:data.city,state:data.state},{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'Postcode lookup is unavailable. Enter the address manually. Nigerian postcodes may be left blank.'},{status:400});}
}
