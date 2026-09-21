import { renderToString } from "react-dom/server";
import { App } from "./app";
import { CATALOG_PREVIEW, type CatalogProduct } from "@/lib/catalog";
export { productSeo, productJsonLd } from "@/lib/product-seo";
export { SEO_PAGES, SITE_URL, SOCIAL_IMAGE } from "@/lib/seo";

export function render(path: string, products: CatalogProduct[] = CATALOG_PREVIEW) {
  return { html: renderToString(<App path={path} products={products} />), products };
}

export const defaultProducts = CATALOG_PREVIEW;
