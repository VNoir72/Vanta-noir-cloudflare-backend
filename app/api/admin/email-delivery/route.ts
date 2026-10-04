import {getDbBinding} from '@/lib/runtime-env';
import {z} from 'zod';
import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {rateLimit} from '@/lib/commerce-db';
import {configureEmailWebhook,connectEmailTracking,emailDeliveryData,resendOrderConfirmation} from '@/lib/email-delivery';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});if(auth.role!=='owner')return Response.json({error:'Owner access required.'},{status:403});
 const reference=new URL(request.url).searchParams.get('reference')||'';if(reference&&!/^VN-[A-Z0-9-]{1,115}$/.test(reference))return Response.json({error:'Enter an order reference.'},{status:400});
 return Response.json(await emailDeliveryData(reference),{headers:{'Cache-Control':'no-store'}});
}
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('resend'),reference:z.string().regex(/^VN-[A-Z0-9-]{1,115}$/),recipient:z.string().trim().toLowerCase().email().max(200),requestId:z.string().uuid(),confirmed:z.literal(true)}),
 z.object({action:z.literal('connect')}),z.object({action:z.literal('secret'),secret:z.string().trim().min(20).max(200)})]);
export async function POST(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});if(auth.role!=='owner')return Response.json({error:'Owner access required.'},{status:403});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Open Store admin to make this change.'},{status:403});
 if(!await rateLimit(request,'owner-email-action',20,3600))return Response.json({error:'Too many requests. Please wait before retrying.'},{status:429});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:'Check the email address, order reference and confirmation.'},{status:400});
 try{const v=parsed.data;if(v.action==='resend')return Response.json(await resendOrderConfirmation(v,auth.email));if(v.action==='secret')await configureEmailWebhook(v.secret);else await connectEmailTracking(true);await getDbBinding().prepare('INSERT INTO admin_audit(actor,action,entity,detail) VALUES(?,?,?,?)').bind(auth.email,'email tracking setup',v.action,'Signing secret is never included in the audit log.').run();return Response.json({ok:true});}catch(e){return Response.json({error:e instanceof Error?e.message:'Email action could not complete.'},{status:409});}
}
