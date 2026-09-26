import { z } from "zod";

import { adminAuthStateFromRequest } from "@/lib/admin-auth";
import { adjustStock } from "@/lib/operations";
import { listInventory } from "@/lib/store-db";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  variantId: z.string().trim().min(3).max(120),
  expectedStock: z.number().int().min(0).max(100_000),
  stock: z.number().int().min(0).max(10_000),
});

export async function GET(request: Request) {
  const auth = await adminAuthStateFromRequest(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  return Response.json({ inventory: await listInventory() });
}

export async function PATCH(request: Request) {
  const auth = await adminAuthStateFromRequest(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid stock update." }, { status: 400 });
  try {
    await adjustStock({...parsed.data,reason:"Inventory update"},auth.email);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({error:error instanceof Error ? error.message : "Stock could not be updated."},{status:409});
  }
}
