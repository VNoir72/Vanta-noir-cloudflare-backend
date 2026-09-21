import { adminAuthStateFromRequest } from "@/lib/admin-auth";
import { getAdminAnalytics } from "@/lib/store-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await adminAuthStateFromRequest(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  try {
    return Response.json({ analytics: await getAdminAnalytics() });
  } catch {
    return Response.json({ error: "Analytics are temporarily unavailable." }, { status: 500 });
  }
}
