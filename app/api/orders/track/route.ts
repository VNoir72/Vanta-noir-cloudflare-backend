import { rateLimit } from "@/lib/commerce-db";
import { z } from "zod";

import { getGuestOrder } from "@/lib/store-db";

export const dynamic = "force-dynamic";

const trackSchema = z.object({
  reference: z.string().trim().min(6).max(120),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  phone: z.string().trim().min(7).max(30).optional().or(z.literal("")),
}).refine((value) => Boolean(value.email || value.phone), {
  message: "Enter the email or phone number used at checkout.",
});

export async function POST(request: Request) {
  if (!await rateLimit(request,"order-lookup",25,600)) return Response.json({error:"Please wait before trying another order lookup."},{status:429});
  const parsed = trackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Enter your order reference and the email or phone used at checkout." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const order = await getGuestOrder(parsed.data.reference, parsed.data.email ?? "", parsed.data.phone ?? "");
  if (!order) {
    return Response.json(
      { error: "We could not find an order matching those details." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json({ order }, { headers: { "Cache-Control": "no-store" } });
}
