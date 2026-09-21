type Settings = { ALLOWED_ORIGINS?: string; AUTH_PROVIDER?: string; STOREFRONT_URL?: string };

export function corsOrigin(request: Request, settings: Settings) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const allowed = new Set((settings.ALLOWED_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean));
  allowed.add(new URL(request.url).origin);
  return allowed.has(origin) ? origin : null;
}

export function checkApiRequest(request: Request, settings: Settings): Response | null {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;
  const origin = request.headers.get("origin");
  if (origin && !corsOrigin(request, settings)) return Response.json({ error: "This origin is not allowed." }, { status: 403 });
  if (url.pathname.startsWith("/api/admin/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)
    && origin !== url.origin) return Response.json({ error: "Open the admin dashboard to make this change." }, { status: 403 });
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  const maxBytes = url.pathname === "/api/admin/uploads" ? 13 * 1024 * 1024 : 128 * 1024;
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) return Response.json({ error: "The request is too large." }, { status: 413 });
  return null;
}

export function secureResponse(response: Response, request: Request, settings: Settings) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  const path = new URL(request.url).pathname;
  // HTML and RSC payloads contain release-specific chunk URLs. Reusing them
  // after publishing can request files that belonged to a previous release.
  if (/^(text\/html|text\/x-component)\b/i.test(headers.get("Content-Type") || "")) {
    headers.set("Cache-Control", "no-store");
  }
  if (path.startsWith("/api/") && !path.startsWith("/api/media/")) headers.set("Cache-Control", "no-store");
  if (path.startsWith("/admin") || path.startsWith("/api/admin/") || path.startsWith("/checkout/")) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
    headers.set("Cache-Control", "no-store");
  }
  const origin = corsOrigin(request, settings);
  if (origin && path.startsWith("/api/")) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.append("Vary", "Origin");
    headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "600");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
