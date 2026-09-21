import { CATALOG_PREVIEW, STORE_SIZES, type CatalogProduct } from "@/lib/catalog";
import { listCatalog } from "@/lib/store-db";
import { Storefront } from "./storefront";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = { ...pageMetadata("home"), robots: { index: false, follow: false } };

export default async function Home() {
  let products: CatalogProduct[] = CATALOG_PREVIEW;
  try {
    products = await listCatalog();
  } catch {
    // Keep local previews and the shell available while a D1 binding is being connected.
  }
  return <Storefront products={products} sizes={[...STORE_SIZES]} />;
}
