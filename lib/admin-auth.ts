import {staffRole} from "./operations";
import { isAdminEmail, runtimeEnv } from "@/lib/runtime-env";
import { createRemoteJWKSet, jwtVerify } from "jose";

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function adminAuthStateFromRequest(request: Request) {
  let email: string | null = null;
  if (!runtimeEnv().ADMIN_EMAIL?.trim()) {
    return { ok: false as const, status: 503, error: "Admin access has not been configured." };
  }
  if (runtimeEnv().AUTH_PROVIDER === "cloudflare-access") {
    try {
      const team = new URL(runtimeEnv().CF_ACCESS_TEAM_DOMAIN ?? "");
      const audience = runtimeEnv().CF_ACCESS_AUD?.trim();
      const token = request.headers.get("cf-access-jwt-assertion");
      if (team.protocol !== "https:" || !team.hostname.endsWith(".cloudflareaccess.com") || !audience || !token) {
        return { ok: false as const, status: 403, error: "Sign in through the store's Cloudflare Access page." };
      }
      let keys = keySets.get(team.origin);
      if (!keys) { keys = createRemoteJWKSet(new URL("/cdn-cgi/access/certs", team.origin)); keySets.set(team.origin, keys); }
      const { payload } = await jwtVerify(token, keys, { issuer: team.origin, audience, algorithms: ["RS256"] });
      email = typeof payload.email === "string" ? payload.email : null;
    } catch {
      return { ok: false as const, status: 403, error: "Admin session is invalid or expired. Please sign in again." };
    }
  }
  const role = email ? await staffRole(email) : null;
  if (!email || !role) {
    return { ok: false as const, status: 403, error: "Admin access denied." };
  }
  const path=new URL(request.url).pathname;
  const allowed = role === "owner" || path === "/admin" || path === "/api/admin/operations"
    || (role === "catalogue" && ["/api/admin/products","/api/admin/inventory","/api/admin/uploads"].includes(path) && request.method!=="DELETE")
    || (role === "analyst" && path === "/api/admin/analytics" && request.method==="GET");
  if(!allowed)return {ok:false as const,status:403,error:"Your staff role cannot access this section."};
  return { ok: true as const, email, role };
}
