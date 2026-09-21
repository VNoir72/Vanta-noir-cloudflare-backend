import { z } from "zod";

import { adminAuthStateFromRequest } from "@/lib/admin-auth";
import { listInventory, updateVariantStock } from "@/lib/store-db";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  variantId: z.string().trim().min(3).max(120),
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
  await updateVariantStock(parsed.data.variantId, parsed.data.stock, auth.email);
  return Response.json({ ok: true });
}
