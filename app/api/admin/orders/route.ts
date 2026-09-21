import { z } from "zod";

import { adminAuthStateFromRequest } from "@/lib/admin-auth";
import { countAdminOrders, listAdminOrders, updateOrderStatus, updateOrderTracking } from "@/lib/store-db";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  reference: z.string().trim().min(3).max(120),
  status: z.enum([
    "paid",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "paid_stock_review",
  ]),
});

export async function GET(request: Request) {
  const auth = await adminAuthStateFromRequest(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  const params = new URL(request.url).searchParams;
  const options = {page:Math.max(1,Math.min(10000,Math.floor(Number(params.get("page"))||1))),query:params.get("query")||"",status:params.get("status")||"",from:params.get("from")||"",to:params.get("to")||""};
  const [orders,total] = await Promise.all([listAdminOrders(options),countAdminOrders(options)]);
  return Response.json({orders,total,page:options.page,hasMore:options.page*50<total});
}

export async function PATCH(request: Request) {
  const auth = await adminAuthStateFromRequest(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  const body=await request.json().catch(()=>null);
  const tracking=z.object({reference:z.string().trim().min(3).max(120),tracking:z.object({carrier:z.string().trim().max(100),trackingNumber:z.string().trim().max(160),trackingUrl:z.string().trim().max(1000).refine(value=>{if(!value)return true;try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password;}catch{return false;}},"Use an HTTPS tracking link."),deliveryEstimate:z.string().trim().max(160)})}).safeParse(body);
  if(tracking.success){try{await updateOrderTracking(tracking.data.reference,tracking.data.tracking);return Response.json({ok:true});}catch{return Response.json({error:"Tracking could not be saved. Check payment status and retry."},{status:400});}}
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid update." }, { status: 400 });
  try {
    await updateOrderStatus(parsed.data.reference, parsed.data.status);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update this order.";
    return Response.json({ error: /^(Order not found|This order cannot|The order changed)/.test(message) ? message : "Could not update this order. Please refresh and retry." }, { status: 409 });
  }
}
