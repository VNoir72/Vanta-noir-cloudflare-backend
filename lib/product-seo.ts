import { SITE_URL } from "./seo";
import type { CatalogProduct } from "./catalog";
import imageVariants from "./image-assets.json";
function imageUrl(src: string) {
  const variants=(imageVariants as Record<string, Array<{src:string;width:number}>>)[src];
  return new URL(variants?.at(-1)?.src ?? src,SITE_URL).href;
}
export function productSeo(product: CatalogProduct) {
  return { path: `/products/${product.slug}`, title: product.details?.seoTitle || `${product.name.replace(/^\d+\s+/,"")} | Vanta Noir`, description: product.details?.seoDescription || product.description.slice(0, 200), image: imageUrl(product.imageUrl) };
}
export function productJsonLd(product: CatalogProduct) {
  const seo=productSeo(product); const available=product.details?.availability!=="preview" && product.details?.priceStatus!=="proposed" && product.colorways.some(c=>Object.values(c.stock).some(n=>n>0));
  return { "@context":"https://schema.org", "@type":"Product", name:product.name, description:seo.description,
    image:[...new Set((product.images?.length ? product.images.map(i=>i.imageUrl) : [product.imageUrl]).map(imageUrl))],
    sku:product.id, brand:{"@type":"Brand", name:"Vanta Noir"}, category:product.category,
    ...(product.details?.fabric ? {material:product.details.fabric}:{}),
    color:product.colorways.map(c=>c.name).join(", "), size:[...new Set(product.colorways.flatMap(c=>Object.keys(c.stock)))],
    ...(product.details?.priceStatus === "proposed" ? {} : {offers:{"@type":"Offer", url:`${SITE_URL}${seo.path}`, priceCurrency:"NGN", price:product.priceKobo/100,
      availability:`https://schema.org/${!available ? "OutOfStock" : product.details?.availability === "preorder" ? "PreOrder" : "InStock"}`,
      itemCondition:"https://schema.org/NewCondition", seller:{"@type":"Organization",name:"Vanta Noir"}}}),
  };
}
