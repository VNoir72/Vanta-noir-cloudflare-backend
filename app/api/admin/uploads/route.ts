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

  const extension = CONTENT_TYPES.get(file.type);
  const key = `products/${crypto.randomUUID()}.${extension}`;
  await bucket.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  const origin = new URL(request.url).origin;
  return Response.json({ url: `${origin}/api/media/${key}` }, { status: 201 });
}
