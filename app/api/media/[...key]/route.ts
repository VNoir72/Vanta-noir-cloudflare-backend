import { runtimeEnv } from "@/lib/runtime-env";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const bucket = runtimeEnv().BUCKET;
  if (!bucket) return new Response("Image storage is not available.", { status: 503 });

  const { key } = await params;
  if (!/^products\/[a-f0-9-]+\.(jpg|png|webp|avif|mp4|webm)$/.test(key.join("/"))) return new Response("Image not found.", { status: 404 });
  const range=_request.headers.get('range');
  const head=range?await bucket.head(key.join('/')):null;
  if(range&&!head)return new Response('Not found',{status:404});
  const match=range?.match(/^bytes=(\d+)-(\d*)$/);
  if(range&&!match)return new Response(null,{status:416});
  const offset=match?Number(match[1]):0,end=match?Math.min(match[2]?Number(match[2]):head!.size-1,head!.size-1):0;
  if(match&&(offset>end||offset>=head!.size))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${head!.size}`}});
  const object = await bucket.get(key.join("/"),match?{range:{offset,length:end-offset+1}}:undefined);
  if (!object) return new Response("Image not found.", { status: 404 });

  const headers = new Headers();
  headers.set("content-type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("cache-control", object.httpMetadata?.cacheControl ?? "public, max-age=31536000, immutable");
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  if (_request.headers.get("if-none-match") === object.httpEtag) return new Response(null, { status: 304, headers });
  headers.set('Accept-Ranges','bytes');if(match)headers.set('Content-Range',`bytes ${offset}-${end}/${head!.size}`);
  return new Response(object.body, {status:match?206:200, headers });
}
