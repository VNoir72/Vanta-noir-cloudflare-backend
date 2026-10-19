import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {customerAccountAccess,changeCustomerAccountAccess,CustomerAccessError} from '@/lib/customer-access';
import {ZodError} from 'zod';
const headers={'Cache-Control':'no-store'};
async function handle(request:Request,write:boolean){
 const auth=await adminAuthStateFromRequest(request);
 if(!auth.ok)return Response.json({error:auth.error},{status:auth.status,headers});
 if(auth.role!=='owner')return Response.json({error:'Owner access required.'},{status:403,headers});
 try{
  if(!write)return Response.json(await customerAccountAccess(new URL(request.url).searchParams.get('email')||''),{headers});
  const body=await request.text();
  if(body.length>5000)return Response.json({error:'Request is too large.'},{status:413,headers});
  return Response.json(await changeCustomerAccountAccess(JSON.parse(body),auth.email),{headers});
 }catch(error){
  const status=error instanceof CustomerAccessError?error.status:error instanceof ZodError||error instanceof SyntaxError?400:503;
  const message=error instanceof CustomerAccessError?error.message:status===400?'Enter a valid customer, current version and a reason of 5–1000 characters.':'Account access could not be updated. Reload its status before retrying.';
  return Response.json({error:message},{status,headers});
 }
}
export const GET=(request:Request)=>handle(request,false);
export const POST=(request:Request)=>handle(request,true);
