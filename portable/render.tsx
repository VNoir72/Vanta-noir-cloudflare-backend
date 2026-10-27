import { renderToString } from "react-dom/server";
import { App,routePage } from "./app";
import { CATALOG_PREVIEW,type CatalogProduct } from "@/lib/catalog";
export { productSeo, productJsonLd } from "@/lib/product-seo";
export { individualProductViews } from "@/lib/catalog-images";
export { SEO_PAGES, SITE_URL, SOCIAL_IMAGE } from "@/lib/seo";

export async function render(path: string, products: CatalogProduct[] = CATALOG_PREVIEW) {
  // Live catalogue data is fetched after hydration. Do not embed all hundreds
  // of products in every static page, or use this snapshot to change a bag.
  const initial: CatalogProduct[] = [];
  return { html: renderToString(<App>{await routePage(path,initial)}</App>), products: initial };
}

export const defaultProducts = CATALOG_PREVIEW;
