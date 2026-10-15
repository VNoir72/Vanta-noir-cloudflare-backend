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
  const maxBytes = url.pathname === "/api/admin/uploads" ? 33 * 1024 * 1024 : url.pathname === "/api/customer/me" && request.method === "PATCH" ? 1600 * 1024 : 128 * 1024;
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) return Response.json({ error: "The request is too large." }, { status: 413 });
  return null;
}

export function secureResponse(response: Response, request: Request, settings: Settings) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  if (!headers.has("Content-Security-Policy")) headers.set("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if(new URL(request.url).protocol==="https:")headers.set("Strict-Transport-Security", "max-age=31536000");
  if (!headers.has("Referrer-Policy")) headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
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
    headers.set("Access-Control-Allow-Headers", "Content-Type, X-Receipt-Token, Authorization");
    headers.set("Access-Control-Max-Age", "600");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// Count actual bytes before any parser sees the body, including chunked requests.
export async function boundedApiRequest(request:Request, timeoutMs=15000):Promise<Request|Response>{
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/api/')||!request.body)return request;
 const limit=path==='/api/admin/uploads'?33*1024*1024:path==='/api/customer/me'&&request.method==='PATCH'?1600*1024:128*1024;
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let total=0;
 let timer:ReturnType<typeof setTimeout>|undefined;let timedOut=false;
 const timeout=new Promise<{done:true;value:undefined}>(resolve=>{timer=setTimeout(()=>{timedOut=true;void reader.cancel().catch(()=>{});resolve({done:true,value:undefined});},timeoutMs);});
 const deadline=Date.now()+timeoutMs;
 try{
  while(true){const {done,value}=await Promise.race([reader.read(),timeout]);if(timedOut||Date.now()>=deadline)return Response.json({error:'Request body took too long.'},{status:408});if(done)break;total+=value.byteLength;
   if(total>limit){await reader.cancel();return Response.json({error:'The request is too large.'},{status:413});}
   chunks.push(value);
  }
 }finally{clearTimeout(timer);reader.releaseLock();}
 const body=new Uint8Array(total);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
 return new Request(request,{body});
}
