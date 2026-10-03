import { renderToString } from "react-dom/server";
import { App } from "./app";
import { CATALOG_PREVIEW, type CatalogProduct } from "@/lib/catalog";
export { productSeo, productJsonLd } from "@/lib/product-seo";
export { individualProductViews } from "@/lib/catalog-images";
export { SEO_PAGES, SITE_URL, SOCIAL_IMAGE } from "@/lib/seo";

export function render(path: string, products: CatalogProduct[] = CATALOG_PREVIEW) {
  // Live catalogue data is fetched after hydration. Do not embed all hundreds
  // of products in every static page, or use this snapshot to change a bag.
  const slug = path.startsWith('/products/') ? path.split('/')[2] : null;
  const initial = path === '/' ? products.slice(0, 36) : slug
    ? products.filter(product => product.slug === slug) : [];
  return { html: renderToString(<App path={path} products={initial} />), products: initial };
}

export const defaultProducts = CATALOG_PREVIEW;
