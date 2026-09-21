import { z } from "zod";
import { rateLimit, subscribe, subscriptionSchema, unsubscribe, confirmSubscription } from "@/lib/commerce-db";
export async function POST(request: Request) {
  const body=await request.json().catch(()=>null);
  const preference=z.object({action:z.enum(["unsubscribe","confirm"]),token:z.string().min(50).max(100)}).safeParse(body);
  if(preference.success){const ok=preference.data.action==="confirm" ? await confirmSubscription(preference.data.token) : await unsubscribe(preference.data.token);return Response.json(ok?{ok:true}:{error:"This email preference link is invalid or has expired."},{status:ok?200:400});}
  if(!await rateLimit(request,"subscriptions",8,3600))return Response.json({error:"Please wait before trying again."},{status:429});
  const parsed=subscriptionSchema.safeParse(body);if(!parsed.success)return Response.json({error:"Enter a valid email address and agree to receive these emails."},{status:400});
  try{await subscribe(parsed.data);return Response.json({ok:true});}catch(error){return Response.json({error:error instanceof Error && error.message.startsWith("This size") ? error.message : "Your request could not be saved. Please try again."},{status:400});}
}
