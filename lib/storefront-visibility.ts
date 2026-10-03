export type PublicProductMetadata = { slug: string; name: string; description: string; imageUrl: string; detailsJson: string };

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
    const product = await db.prepare("SELECT slug, name, description, image_url AS imageUrl, details_json AS detailsJson FROM products WHERE slug = ? AND active = 1 AND status = 'published' LIMIT 1").bind(slug).first<PublicProductMetadata>();
    if (!product) return Response.json({}, { status: 404, headers });
    let details: {seoTitle?:string;seoDescription?:string} = {};
    try { details = JSON.parse(product.detailsJson); } catch { /* Use public description. */ }
    return Response.json({ slug: product.slug, title: details.seoTitle || `${product.name} | Vanta Noir`, description: details.seoDescription || product.description, image: product.imageUrl }, { headers });
  } catch {
    return Response.json({ error: 'Please try again shortly.' }, { status: 503, headers });
  }
}
