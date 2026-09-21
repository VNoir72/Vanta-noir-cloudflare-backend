import products from "@/data/season01-products.json";
import reconciliation from "@/data/season01-reconciliation.json";
import { getDbBinding } from "./runtime-env";

// A one-time catalogue import, not a runtime schema migration. After import,
// the admin-managed D1 records remain authoritative.
export async function importSeason01Catalogue() {
  const db = getDbBinding();
  const complete = "vd_season01_catalogue_20260920";
  if (await db.prepare("SELECT value FROM store_meta WHERE key = ?").bind(complete).first()) return;
  for (const product of products) {
    const marker = `${complete}:${product.id}`;
    if (await db.prepare("SELECT value FROM store_meta WHERE key = ?").bind(marker).first()) continue;
    const gate = "NOT EXISTS (SELECT 1 FROM store_meta WHERE key = ?)";
    const map = reconciliation.find(row => row.newId === product.id)!;
    const variants = product.colorways.flatMap(color => Object.keys(color.stock).map(size => ({
      id: `${product.id}-${color.slug}-${size.toLowerCase().replaceAll(" ", "-")}`,
      sku: `${product.id}-${color.slug}-${size}`.toUpperCase().replaceAll(" ", "-"),
      size, color: color.name, hex: color.hex,
    })));
    const statements = [
      db.prepare(`INSERT OR IGNORE INTO products
        (id,slug,name,category,description,price_kobo,image_url,image_alt,details_json,active,status,featured,sort_order)
        SELECT ?,?,?,?,?,?,?,?,?,1,'published',0,? WHERE ${gate}`)
        .bind(product.id,product.slug,product.name,product.category,product.description,product.priceKobo,
          product.imageUrl,product.imageAlt,JSON.stringify(product.details),map.number,marker),
      db.prepare(`INSERT OR IGNORE INTO product_variants
        (id,product_id,sku,size,color,color_hex,stock,active)
        SELECT json_extract(value,'$.id'),?,json_extract(value,'$.sku'),json_extract(value,'$.size'),
          json_extract(value,'$.color'),json_extract(value,'$.hex'),0,1 FROM json_each(?) WHERE ${gate}`)
        .bind(product.id,JSON.stringify(variants),marker),
      db.prepare(`INSERT OR IGNORE INTO product_images (id,product_id,color,image_url,image_alt,sort_order)
        SELECT ? || '-' || key,?,json_extract(value,'$.color'),json_extract(value,'$.imageUrl'),
          json_extract(value,'$.imageAlt'),CAST(key AS INTEGER) FROM json_each(?) WHERE ${gate}`)
        .bind(`vd-image-${product.id}`,product.id,JSON.stringify(product.images),marker),
    ];
    if (map.replaces) statements.push(db.prepare(`UPDATE products
      SET active=0,status='archived',updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND image_url=? AND ${gate}`)
      .bind(map.replaces,map.oldImage,marker));
    statements.push(db.prepare("INSERT OR IGNORE INTO store_meta (key,value) VALUES (?, '1')").bind(marker));
    // Each product and its variants/images are committed together. A failed
    // import can resume without overwriting later admin edits or stock.
    await db.batch(statements);
  }
  await db.batch([
    db.prepare(`UPDATE products SET price_kobo=3000000,
      details_json=json_set(details_json,'$.priceStatus','approved','$.suggestedPriceNgn',30000),
      updated_at=CURRENT_TIMESTAMP WHERE id='vn-p042'
      AND NOT EXISTS (SELECT 1 FROM store_meta WHERE key=?)`).bind(complete),
    db.prepare(`UPDATE products SET price_kobo=2000000,
      details_json=json_set(details_json,'$.priceStatus','approved','$.suggestedPriceNgn',20000),
      updated_at=CURRENT_TIMESTAMP WHERE id='vn-p049'
      AND NOT EXISTS (SELECT 1 FROM store_meta WHERE key=?)`).bind(complete),
    db.prepare("INSERT OR IGNORE INTO store_meta (key,value) VALUES (?, '26 designs; 130 colourways; 390 views')").bind(complete),
  ]);
}
