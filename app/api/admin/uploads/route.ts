import {submitApproval,pendingResponse} from '@/lib/approvals';
import { matchesImageSignature } from "@/lib/image-signature";
import { adminAuthStateFromRequest } from "@/lib/admin-auth";
import { runtimeEnv } from "@/lib/runtime-env";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const CONTENT_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

export async function POST(request: Request) {
  const auth = await adminAuthStateFromRequest(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const bucket = runtimeEnv().BUCKET;
  if (!bucket) return Response.json({ error: "Image storage is not available yet." }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose an image first." }, { status: 400 });
  if (!CONTENT_TYPES.has(file.type)) return Response.json({ error: "Use a JPG, PNG, WebP, or AVIF image." }, { status: 400 });
  if (!file.size || file.size > MAX_IMAGE_BYTES) return Response.json({ error: "Choose a non-empty image of 12 MB or smaller." }, { status: 400 });

  const signature=new Uint8Array(await file.slice(0,64).arrayBuffer());
  if(!matchesImageSignature(signature,file.type))return Response.json({error:"The file contents do not match its image type."},{status:400});

  const extension = CONTENT_TYPES.get(file.type);
  const key = `${auth.role==='owner'?'products':'approval-staging'}/${crypto.randomUUID()}.${extension}`;
  await bucket.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  if(auth.role!=='owner'){try{return pendingResponse(await submitApproval(auth,'upload',{key,name:file.name.slice(0,255),contentType:file.type}));}catch{await bucket.delete(key);return Response.json({error:'Image could not be submitted for approval.'},{status:503});}}
  const origin = new URL(request.url).origin;
  return Response.json({ url: `${origin}/api/media/${key}` }, { status: 201 });
}
