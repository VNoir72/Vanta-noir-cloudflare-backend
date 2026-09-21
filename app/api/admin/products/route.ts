import { z } from "zod";
import { productDetailsSchema } from "@/lib/product-details";
import { storeSizeSchema } from "@/lib/sizing";

import { adminAuthStateFromRequest } from "@/lib/admin-auth";
import {
  PRODUCT_STATUSES,
  deleteAdminProduct,
  listAdminProducts,
  saveAdminProduct,
  setAdminProductStatus,
} from "@/lib/store-db";

export const dynamic = "force-dynamic";

import { productSchema } from "@/lib/product-input";

const statusSchema = z.object({
  productId: z.string().trim().min(1).max(160),
  status: z.enum(PRODUCT_STATUSES),
});

function invalidPayload() {
  return Response.json({ error: "Please complete the product details and variations." }, { status: 400 });
}

export async function GET(request: Request) {
  const auth = await adminAuthStateFromRequest(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  try {
    return Response.json({ products: await listAdminProducts() });
  } catch {
    return Response.json({ error: "Products could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await adminAuthStateFromRequest(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidPayload();

  try {
    const product = await saveAdminProduct({ ...parsed.data, id: undefined }, auth.email);
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product could not be created.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await adminAuthStateFromRequest(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const statusUpdate = statusSchema.safeParse(body);
  try {
    if (statusUpdate.success) {
      const product = await setAdminProductStatus(statusUpdate.data.productId, statusUpdate.data.status);
      return Response.json({ product });
    }

    const parsed = productSchema.safeParse(body);
    if (!parsed.success || !parsed.data.id) return invalidPayload();
    const product = await saveAdminProduct(parsed.data, auth.email);
    return Response.json({ product });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product could not be updated.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await adminAuthStateFromRequest(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = z.object({ productId: z.string().trim().min(1).max(160) }).safeParse(body);
  if (!parsed.success) return Response.json({ error: "A product is required." }, { status: 400 });

  try {
    await deleteAdminProduct(parsed.data.productId);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product could not be deleted.";
    return Response.json({ error: message }, { status: 400 });
  }
}
