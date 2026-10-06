import {z} from 'zod';
import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {supportData,applySupportChange,markSupportRead} from '@/lib/support';
import {submitApproval,pendingResponse} from '@/lib/approvals';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 if(!['owner','support'].includes(auth.role))return Response.json({error:'Support access required.'},{status:403});
 try{return Response.json(await supportData(auth,new URL(request.url).searchParams),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Support records could not load. Refresh to try again.'},{status:503});}
}
export async function POST(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 if(!['owner','support'].includes(auth.role))return Response.json({error:'Support access required.'},{status:403});
 const text=await request.text();if(text.length>15000)return Response.json({error:'Keep the enquiry under 15 KB.'},{status:413});
 try{const raw=JSON.parse(text);if(raw.action==='support:seen'){const v=z.object({action:z.literal('support:seen'),id:z.string().uuid(),version:z.number().int().positive()}).strict().parse(raw);await markSupportRead(auth.email,v.id,v.version);return Response.json({ok:true});}const v=z.object({action:z.enum(['support:create','support:update']),data:z.unknown()}).strict().parse(JSON.parse(text));
 if(auth.role!=='owner')return pendingResponse(await submitApproval(auth,v.action,v.data));
 return Response.json(await applySupportChange(v.action,v.data,auth.email),{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof z.ZodError?e.issues[0]?.message:e instanceof Error?e.message:'Could not save enquiry.'},{status:409});}
}
