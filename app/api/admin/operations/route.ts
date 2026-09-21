import {getDbBinding} from '@/lib/runtime-env';
import {z} from 'zod';
import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {permits,operationsData,adjustStock,bulkPrices,importProducts,savePromotion,saveStaff,allocateExchange,exchangeTracking,orderAction,audit} from '@/lib/operations';
import {updateReturn,returnUpdateSchema} from '@/lib/commerce-db';
import {updateOrderTracking} from '@/lib/store-db';
export const dynamic='force-dynamic';
export async function GET(request:Request){const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});const p=new URL(request.url).searchParams,resource=p.get('resource')||'orders';if(!permits(auth.role,resource))return Response.json({error:'Access denied.'},{status:403});try{return Response.json(await operationsData(resource,p),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'This section could not load. Try again.'},{status:503});}}
const actionResource:Record<string,string>={stock:'inventory',prices:'bulk',import:'bulk',promotion:'promotions',staff:'staff',exchange:'returns','exchange-tracking':'returns',return:'returns',order:'orders',tracking:'orders'};
export async function POST(request:Request){const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});if(Number(request.headers.get('content-length'))>1000000)return Response.json({error:'Upload at most 25 products per batch.'},{status:413});const raw=await request.text();if(raw.length>1000000)return Response.json({error:'Upload at most 25 products per batch.'},{status:413});let body:{action:string;data?:unknown};try{body=z.object({action:z.string(),data:z.unknown()}).parse(JSON.parse(raw));}catch{return Response.json({error:'Invalid request.'},{status:400});}const resource=actionResource[body.action];if(!resource||!permits(auth.role,resource))return Response.json({error:'Access denied.'},{status:403});try{let result:unknown={ok:true};const data=body.data;
 if(body.action==='stock')await adjustStock(data,auth.email);
 if(body.action==='prices')result=await bulkPrices(data,auth.email);
 if(body.action==='import')result=await importProducts(data,auth.email);
 if(body.action==='promotion')await savePromotion(data,auth.email);
 if(body.action==='staff')await saveStaff(data,auth.email);
 if(body.action==='exchange')await allocateExchange(data,auth.email);
 if(body.action==='exchange-tracking')await exchangeTracking(data,auth.email);
 if(body.action==='order')await orderAction(data,auth.email,auth.role);
 if(body.action==='return'){const parsed=returnUpdateSchema.parse(data);if(auth.role!=='owner'){const current=await getDbBinding().prepare('SELECT refund_kobo,refund_status,refund_reference FROM return_requests WHERE id=?').bind(parsed.id).first<{refund_kobo:number;refund_status:string;refund_reference:string}>();if(!current||parsed.refundKobo!==current.refund_kobo||parsed.refundStatus!==current.refund_status||parsed.refundReference!==current.refund_reference)return Response.json({error:'Only the owner can change refunds.'},{status:403});}await updateReturn(parsed,auth.email);await audit(auth.email,'return update',parsed.id,parsed.status);}
 if(body.action==='tracking'){const v=z.object({reference:z.string().min(3),carrier:z.string().trim().min(1).max(100),trackingNumber:z.string().trim().min(1).max(160),trackingUrl:z.string().max(1000).refine(s=>!s||(/^https:\/\//.test(s)&&!new URL(s).username&&!new URL(s).password)),deliveryEstimate:z.string().max(160)}).parse(data);await updateOrderTracking(v.reference,v);await audit(auth.email,'tracking',v.reference);}
 return Response.json({result});}catch(e){return Response.json({error:e instanceof z.ZodError?e.issues[0]?.message:e instanceof Error?e.message:'Changes could not be saved.'},{status:400});}}
