export type PublicProductMetadata = { slug: string; name: string; description: string; imageUrl: string; detailsJson: string; id:string; category:string; priceKobo:number; inStock:number };

// A narrow public query: never expose draft names or fall back to a static catalogue.
export async function storefrontVisibility(request: Request, db: D1Database) {
  const url = new URL(request.url);
  const headers = { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex' };
  try {
    if (url.searchParams.get('mode') === 'sitemap') {
      const rows = await db.prepare("SELECT slug FROM products WHERE active = 1 AND status = 'published' ORDER BY slug").all<{slug:string}>();
      return Response.json({ slugs: rows.results.map(row => row.slug) }, { headers });
    }
    const slug = url.searchParams.get('slug') ?? '';
    if (!/^[a-z0-9][a-z0-9_-]{0,239}$/.test(slug)) return Response.json({}, { status: 404, headers });
    const product = await db.prepare("SELECT p.id, p.slug, p.name, p.category, p.price_kobo AS priceKobo, p.description, p.image_url AS imageUrl, p.details_json AS detailsJson, EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.active=1 AND v.stock>COALESCE((SELECT SUM(r.quantity) FROM stock_reservations r WHERE r.variant_id=v.id AND r.expires_at>CURRENT_TIMESTAMP),0)) AS inStock FROM products p WHERE slug = ? AND active = 1 AND status = 'published' LIMIT 1").bind(slug).first<PublicProductMetadata>();
    if (!product) return Response.json({}, { status: 404, headers });
    let details: {seoTitle?:string;seoDescription?:string;availability?:string;priceStatus?:string} = {};
    try { details = JSON.parse(product.detailsJson); } catch { /* Use public description. */ }
    const description=details.seoDescription || product.description;
    const canonical=`https://vantanoir.store/products/${product.slug}`;
    const image=new URL(product.imageUrl,'https://vantanoir.store').href;
    const structuredData={"@context":"https://schema.org","@type":"Product",name:product.name,description,image:[image],sku:product.id,category:product.category,brand:{"@type":"Brand",name:"Vanta Noir"},url:canonical,
      ...(details.priceStatus==='proposed'||details.availability==='preview'?{}:{offers:{"@type":"Offer",url:canonical,priceCurrency:"NGN",price:product.priceKobo/100,availability:`https://schema.org/${!product.inStock?'OutOfStock':details.availability==='preorder'?'PreOrder':'InStock'}`,itemCondition:"https://schema.org/NewCondition"}})};
    return Response.json({ slug: product.slug, title: details.seoTitle || `${product.name} | Vanta Noir`, description, image:product.imageUrl, structuredData }, { headers });
  } catch {
    return Response.json({ error: 'Please try again shortly.' }, { status: 503, headers });
  }
}
