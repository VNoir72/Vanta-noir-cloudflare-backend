import { runtimeEnv } from "@/lib/runtime-env";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const bucket = runtimeEnv().BUCKET;
  if (!bucket) return new Response("Image storage is not available.", { status: 503 });

  const { key } = await params;
  if (!/^products\/[a-f0-9-]+\.(jpg|png|webp|avif)$/.test(key.join("/"))) return new Response("Image not found.", { status: 404 });
  const object = await bucket.get(key.join("/"));
  if (!object) return new Response("Image not found.", { status: 404 });

  const headers = new Headers();
  headers.set("content-type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("cache-control", object.httpMetadata?.cacheControl ?? "public, max-age=31536000, immutable");
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  if (_request.headers.get("if-none-match") === object.httpEtag) return new Response(null, { status: 304, headers });
  return new Response(object.body, { headers });
}
