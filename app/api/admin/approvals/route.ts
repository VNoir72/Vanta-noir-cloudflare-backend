import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {listApprovals,reviewApproval,approvalImage} from '@/lib/approvals';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 try{const p=new URL(request.url).searchParams;if(p.get('image'))return approvalImage(auth,p.get('image')!);return Response.json(await listApprovals(auth,p),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Approval requests could not load.'},{status:503});}
}
export async function POST(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 if(auth.role!=='owner')return Response.json({error:'Only the owner can approve or reject changes.'},{status:403});
 try{return Response.json(await reviewApproval(auth,await request.json()),{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:e instanceof Error?e.message:'Review failed.'},{status:409});}
}
