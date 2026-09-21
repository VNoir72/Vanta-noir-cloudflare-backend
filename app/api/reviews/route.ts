import { listReviews, rateLimit, reviewSchema, submitReview } from "@/lib/commerce-db";
export const dynamic="force-dynamic";
export async function GET(request: Request){const url=new URL(request.url);const page=Math.min(10000,Math.max(1,Number(url.searchParams.get("page"))||1));return Response.json(await listReviews((url.searchParams.get("productId")||"").slice(0,160),Math.floor(page)));}
export async function POST(request: Request){
 if(!await rateLimit(request,"reviews",10,3600))return Response.json({error:"Please wait before trying again."},{status:429});
 const parsed=reviewSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Complete your order details, rating and review."},{status:400});
 try{await submitReview(parsed.data);return Response.json({ok:true},{status:201});}catch(e){const message=e instanceof Error?e.message:"";return Response.json({error:/^(Use the reference|You have already)/.test(message)?message:"Your review could not be saved. Please try again."},{status:400});}
}
