import { productSeo, productJsonLd } from "@/lib/product-seo";
import { SITE_URL } from "@/lib/seo";
import { notFound, permanentRedirect } from "next/navigation";
import reconciliation from "@/data/season01-reconciliation.json";
import type { Metadata } from "next";
import { listCatalog } from "@/lib/store-db";
import { CATALOG_PREVIEW, STORE_SIZES } from "@/lib/catalog";
import { Storefront } from "@/app/storefront";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
async function catalog() { try { return await listCatalog(); } catch { return CATALOG_PREVIEW; } }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = (await catalog()).find(p => p.slug === slug);
  if(!product)return {title:"Product unavailable",robots:{index:false,follow:false}};
  const seo=productSeo(product);
  return {title:{absolute:seo.title},description:seo.description,alternates:{canonical:SITE_URL+seo.path},openGraph:{type:"website",title:seo.title,description:seo.description,url:SITE_URL+seo.path,images:[seo.image]},twitter:{card:"summary_large_image",title:seo.title,description:seo.description,images:[seo.image]},robots:{index:false,follow:false}};
}
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const products = await catalog();
  if (!products.some(p => p.slug === slug)) {
    const replacement = reconciliation.find(row => row.oldSlug === slug);
    if (replacement && products.some(p => p.slug === replacement.newSlug)) permanentRedirect(`/products/${replacement.newSlug}`);
    notFound();
  }
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(productJsonLd(products.find(p=>p.slug===slug)!)).replace(/</g,"\\u003c")}}/><Storefront products={products} sizes={[...STORE_SIZES]} detailSlug={slug} /></>;
}
