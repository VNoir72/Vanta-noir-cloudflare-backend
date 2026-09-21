import { rateLimit, returnSchema, requestReturn } from "@/lib/commerce-db";
export async function POST(request:Request){
 if(!await rateLimit(request,"returns",10,3600))return Response.json({error:"Please wait before trying again."},{status:429});
 const parsed=returnSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Enter your order email, the items and a reason for your request."},{status:400});
 try{return Response.json(await requestReturn(parsed.data),{status:201});}catch(e){const message=e instanceof Error?e.message:"";return Response.json({error:/^(Check your|Check the|This order already)/.test(message)?message:"Your return request could not be saved. Please try again."},{status:400});}
}
