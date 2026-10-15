var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../cloudflare-storefront/worker.mjs
var escape = /* @__PURE__ */ __name((value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("'", "&#39;"), "escape");
function protect(response) {
  const r = new Response(response.body, response);
  r.headers.set("X-Content-Type-Options", "nosniff");
  r.headers.set("Strict-Transport-Security", "max-age=31536000");
  r.headers.set("X-Frame-Options", "DENY");
  r.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  r.headers.set("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
  r.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  r.headers.set("Cache-Control", "no-store");
  r.headers.delete("set-cookie");
  return r;
}
__name(protect, "protect");
function json(value, status = 200) {
  return Response.json(value, { status });
}
__name(json, "json");
async function boundedText(response, limit) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let length = 0;
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) {
        await reader.cancel();
        throw Error("Response too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}
__name(boundedText, "boundedText");
async function publicRead(env, path) {
  return env.PUBLIC_API.fetch(new Request("https://api.vantanoir.store" + path, { headers: { Accept: "application/json" }, redirect: "manual", signal: AbortSignal.timeout(15e3) }));
}
__name(publicRead, "publicRead");
async function asset(env, request, path) {
  const u = new URL(request.url);
  u.pathname = path;
  u.search = "";
  return env.ASSETS.fetch(new Request(u, { method: "GET" }));
}
__name(asset, "asset");
async function htmlPreview(response) {
  const html = await boundedText(response, 15e5);
  return new Response(html, { status: response.status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
__name(htmlPreview, "htmlPreview");
async function route(request, env) {
  const u = new URL(request.url), p = u.pathname;
  if (!["vantanoir.store", "www.vantanoir.store"].includes(u.hostname)) return new Response("Production hostname required", { status: 404 });
  if (u.protocol !== "https:" || u.hostname === "www.vantanoir.store") return Response.redirect("https://vantanoir.store" + p + u.search, 301);
  if (p === "/admin" || p === "/admin/") return Response.redirect("https://api.vantanoir.store/admin", 302);
  if (p.startsWith("/api/")) return Response.redirect("https://api.vantanoir.store" + p + u.search, 307);
  if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  if (/^\/(?:index\.(?:php|htm)|home(?:\.html)?)$/.test(p)) return Response.redirect(u.origin + "/", 302);
  if (/(?:^|\/)\.|\.(?:php|sql|sqlite|db|zip|bak|map|jsonc)$|^\/(?:admin|backups|node_modules|drizzle|lib|app|tests|portable)(?:\/|$)/i.test(p)) return new Response("Not found", { status: 404 });
  if (p === "/health") return json({ ok: true, mode: "production-storefront", source: env.RELEASE_SHA || "unknown" });
  if (p === "/robots.txt") return asset(env, request, "/robots.txt");
  if (p === "/store-config.js") return new Response('window.VANTA_NOIR_CONFIG=Object.freeze({apiBaseUrl:"https://api.vantanoir.store"});', { headers: { "Content-Type": "application/javascript" } });
  if (/^\/images\/vanta-hero(?:-(?:480|960|1600)\.webp|\.png)$/.test(p)) return Response.redirect(u.origin + "/images/vanta-brand-hero-2026.webp", 301);
  if (/^\/images\/[A-Za-z0-9_./-]+\.(?:webp|png|jpg|jpeg|svg|avif|gif|ico)$/.test(p)) return publicRead(env, p);
  if (p === "/sitemap.xml") {
    const live = await publicRead(env, "/api/storefront-visibility?mode=sitemap");
    if (!live.ok) return new Response("Catalogue temporarily unavailable", { status: 503 });
    const data = JSON.parse(await boundedText(live, 2e6));
    if (!Array.isArray(data.slugs)) return new Response("Catalogue temporarily unavailable", { status: 503 });
    const source = await boundedText(await asset(env, request, "/sitemap.xml"), 1e6);
    const entries = data.slugs.filter((s) => typeof s === "string" && /^[a-z0-9][a-z0-9_-]{0,239}$/.test(s)).map((s) => "<url><loc>https://vantanoir.store/products/" + escape(s) + "</loc></url>").join("");
    return new Response(source.replace("</urlset>", entries + "</urlset>"), { headers: { "Content-Type": "application/xml" } });
  }
  if (p.startsWith("/products/")) {
    const m = p.match(/^\/products\/([a-z0-9][a-z0-9_-]{0,239})(?:\.html)?\/?$/);
    if (!m || m[1] === "_dynamic") return new Response("Not found", { status: 404 });
    const slug = m[1];
    const redirects = JSON.parse(env.PRODUCT_REDIRECTS || "{}");
    if (redirects[slug]) return Response.redirect(u.origin + "/products/" + redirects[slug], 301);
    const live = await publicRead(env, "/api/storefront-visibility?slug=" + encodeURIComponent(slug));
    if (live.status === 404) return Response.redirect(u.origin + "/#collection", 302);
    if (!live.ok) return new Response("Product temporarily unavailable. Please try again.", { status: 503 });
    const data = JSON.parse(await boundedText(live, 2e5));
    if (data.slug !== slug || typeof data.title !== "string" || typeof data.description !== "string") return new Response("Product temporarily unavailable", { status: 503 });
    const response2 = await asset(env, request, "/products/_dynamic.html");
    if (!response2.ok) return response2;
    let html = await boundedText(response2, 15e5);
    html = html.replace(/<meta name="robots" content="[^"]*">/g, "");
    html = html.replace('"path":"/products/_dynamic"', '"path":"/products/' + slug + '"').replace(/<title>.*?<\/title>/s, () => "<title>" + escape(data.title) + "</title>");
    const canonical = "https://vantanoir.store/products/" + slug;
    html = html.replace("</head>", '<link rel="canonical" href="' + canonical + '"><meta property="og:url" content="' + canonical + '"></head>');
    const image = typeof data.image === "string" ? data.image.startsWith("/") && !data.image.startsWith("//") ? "https://vantanoir.store" + data.image : data.image : "";
    html = html.replace(/<meta (?:name|property)="(description|og:title|og:description|og:image|twitter:title|twitter:description|twitter:image)" content="[^"]*">/g, (_, name) => "<meta " + (name.startsWith("og:") ? "property" : "name") + '="' + name + '" content="' + escape(name.endsWith("image") ? /^https:\/\//.test(image) ? image : "" : name.endsWith("title") ? data.title : data.description) + '">');
    if (data.structuredData && typeof data.structuredData === "object") html = html.replace("</head>", '<script type="application/ld+json">' + JSON.stringify(data.structuredData).replaceAll("<", "\\u003c") + "<\/script></head>");
    return htmlPreview(new Response(html, { headers: { "Content-Type": "text/html" } }));
  }
  let path = p;
  const old = p.match(/^\/(account|about|contact|help-center|privacy-policy|privacy-choices|shipping-returns|terms-of-service|reviews|case-studies|email-preferences|checkout(?:\/complete)?)(?:\.html|\/index\.html|\/)$/);
  if (old) return Response.redirect(u.origin + "/" + old[1] + u.search, 302);
  if (p === "/") path = "/index.html";
  else if (!p.split("/").at(-1).includes(".")) path = p + ".html";
  let response = await asset(env, request, path);
  if (response.status === 404) {
    const missing = await asset(env, request, "/404.html");
    response = new Response(missing.body, { status: 404, headers: missing.headers });
  }
  return response.headers.get("Content-Type")?.includes("text/html") ? htmlPreview(response) : response;
}
__name(route, "route");
var worker_default = { async fetch(request, env) {
  try {
    const r = protect(await route(request, env));
    return request.method === "HEAD" ? new Response(null, r) : r;
  } catch {
    return protect(new Response("Store temporarily unavailable. Please try again.", { status: 503 }));
  }
} };
export {
  worker_default as default
};


