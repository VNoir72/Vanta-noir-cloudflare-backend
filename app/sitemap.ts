import { listCatalog } from "@/lib/store-db";
import type { MetadataRoute } from "next";
import { SEO_PAGES, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Omit lastModified until genuine content modification dates are available.
  const products = await listCatalog();
  return [...Object.values(SEO_PAGES), ...products.map(p => ({ path: `/products/${p.slug}` }))].map(({ path }) => ({
    url: new URL(path, SITE_URL).href,
  }));
}
