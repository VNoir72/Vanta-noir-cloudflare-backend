import { adminAuthStateFromRequest } from "@/lib/admin-auth";
import { reportRange } from "@/lib/admin-reporting";
import { getAdminAnalytics } from "@/lib/store-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await adminAuthStateFromRequest(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const params=new URL(request.url).searchParams;
  try { reportRange(params); } catch(e) { return Response.json({error:(e as Error).message},{status:400}); }
  try {
    return Response.json({ analytics: await getAdminAnalytics(params) },{headers:{"Cache-Control":"no-store"}});
  } catch {
    return Response.json({ error: "Analytics are temporarily unavailable." }, { status: 500 });
  }
}
