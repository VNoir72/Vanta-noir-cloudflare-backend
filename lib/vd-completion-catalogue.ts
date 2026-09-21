import newProducts from '@/data/vd-completion-products.json';
import metadataUpdates from '@/data/catalogue-metadata-updates.json';
import viewUpdates from '@/data/catalogue-view-updates.json';
import { getDbBinding } from './runtime-env';
import type { CatalogProduct, CatalogImage } from './catalog';
import { productDetails } from './product-details';

export type CatalogueViewUpdate = {
  id: string; oldPrimary: string; oldImageUrls: string[]; imageUrl: string; imageAlt: string;
  oldName: string; name: string; images: CatalogImage[];
};

// Chunked JSON imports keep large reference collections below Worker query limits.
// Stock and subsequent merchant edits stay authoritative after each atomic chunk.
export async function importVdCompletionCatalogue() {
  const products: CatalogProduct[] = newProducts.map(product=>({...product,details:productDetails(product.details)}));
  const updates = viewUpdates as CatalogueViewUpdate[];
  if (products.some(product=>!/^[-a-z0-9]+$/.test(product.id) || !/^[-a-z0-9]+$/.test(product.slug))) throw new Error('Invalid VD catalogue identity');
  if (!products.length && !updates.length) return;
  const db = getDbBinding();
  const key = 'vd_full_collection_20260920';
  const fingerprint = async (value: unknown) => {
    const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));
    return Array.from(new Uint8Array(bytes)).map(byte=>byte.toString(16).padStart(2,'0')).join('');
  };
  const release = `${key}:release:${await fingerprint([products,updates,metadataUpdates])}`;
  const found = await db.prepare('SELECT key FROM store_meta WHERE key = ? OR key LIKE ?').bind(key, `${key}:%`).all<{key:string}>();
  const markers = new Set(found.results.map(row => row.key));
  if (markers.has(release)) return;
  const gate = 'NOT EXISTS (SELECT 1 FROM store_meta WHERE key = ?)';
  for (let offset=0; offset<products.length; offset+=20) {
    const chunk = products.slice(offset,offset+20);
    const marker = `${key}:products:${await fingerprint(chunk)}`;
    if (markers.has(marker)) continue;
    const variants = chunk.flatMap(p => p.colorways.flatMap(c => Object.keys(c.stock).map(size => ({
      id:`${p.id}-${c.slug}-${size.toLowerCase().replaceAll(' ','-')}`, productId:p.id,
      sku:`${p.id}-${c.slug}-${size}`.toUpperCase().replaceAll(' ','-'),size,color:c.name,hex:c.hex,
    }))));
    const images = chunk.flatMap(p => (p.images??[]).map((image,index) => ({...image,id:`vd-full-${p.id}-${index}`,productId:p.id,index})));
    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO products
        (id,slug,name,category,description,price_kobo,image_url,image_alt,details_json,active,status,featured,sort_order)
        SELECT json_extract(value,'$.id'),json_extract(value,'$.slug'),json_extract(value,'$.name'),
        json_extract(value,'$.category'),json_extract(value,'$.description'),json_extract(value,'$.priceKobo'),
        json_extract(value,'$.imageUrl'),json_extract(value,'$.imageAlt'),json_extract(value,'$.details'),1,'published',0,
        ?+CAST(json_each.key AS INTEGER) FROM json_each(?) WHERE ${gate}`)
        .bind(100+offset,JSON.stringify(chunk),marker),
      db.prepare(`INSERT OR IGNORE INTO product_variants (id,product_id,sku,size,color,color_hex,stock,active)
        SELECT json_extract(value,'$.id'),json_extract(value,'$.productId'),json_extract(value,'$.sku'),
        json_extract(value,'$.size'),json_extract(value,'$.color'),json_extract(value,'$.hex'),0,1
        FROM json_each(?) WHERE ${gate}`).bind(JSON.stringify(variants),marker),
      db.prepare(`INSERT OR IGNORE INTO product_images (id,product_id,color,image_url,image_alt,sort_order)
        SELECT json_extract(value,'$.id'),json_extract(value,'$.productId'),json_extract(value,'$.color'),
        json_extract(value,'$.imageUrl'),json_extract(value,'$.imageAlt'),json_extract(value,'$.index')
        FROM json_each(?) WHERE ${gate}`).bind(JSON.stringify(images),marker),
      db.prepare("INSERT OR IGNORE INTO store_meta (key,value) VALUES (?,'1')").bind(marker),
    ]);
  }
  for (const update of updates) {
    const marker = `${key}:views:${update.id}:${await fingerprint(update)}`;
    if (markers.has(marker)) continue;
    const unchanged = `EXISTS (SELECT 1 FROM products WHERE id=? AND image_url=?) AND ${gate}`;
    await db.batch([
      db.prepare(`DELETE FROM product_images WHERE product_id=? AND image_url IN (SELECT value FROM json_each(?)) AND ${unchanged}`)
        .bind(update.id,JSON.stringify(update.oldImageUrls),update.id,update.oldPrimary,marker),
      db.prepare(`INSERT OR IGNORE INTO product_images (id,product_id,color,image_url,image_alt,sort_order)
        SELECT ?||'-'||json_each.key,?,json_extract(value,'$.color'),json_extract(value,'$.imageUrl'),
        json_extract(value,'$.imageAlt'),CAST(json_each.key AS INTEGER) FROM json_each(?) WHERE ${unchanged} AND NOT EXISTS (SELECT 1 FROM product_images existing WHERE existing.product_id=? AND existing.image_url=json_extract(value,'$.imageUrl') AND existing.color=json_extract(value,'$.color'))`)
        .bind(`vd-full-views-${update.id}`,update.id,JSON.stringify(update.images),update.id,update.oldPrimary,marker,update.id),
      db.prepare(`UPDATE products SET image_url=?,image_alt=?,
        description=CASE WHEN id='vn-p013' AND name='Cropped Zip Hoodie' THEN 'Cropped pullover hoodie with a kangaroo pocket.' ELSE description END,
        details_json=CASE WHEN id='vn-p013' AND name='Cropped Zip Hoodie' THEN json_set(details_json,'$.garmentType','Cropped pullover hoodie') ELSE details_json END,
        name=CASE WHEN name=? THEN ? ELSE name END,updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND image_url=? AND ${gate}`)
        .bind(update.imageUrl,update.imageAlt,update.oldName,update.name,update.id,update.oldPrimary,marker),
      db.prepare("INSERT OR IGNORE INTO store_meta (key,value) VALUES (?,'1')").bind(marker),
    ]);
  }
  for (const update of metadataUpdates) {
    const marker = `${key}:metadata:${update.id}:${await fingerprint(update)}`;
    if (markers.has(marker)) continue;
    const statements = [db.prepare(`UPDATE products SET
      name=CASE WHEN name=? THEN ? ELSE name END,
      category=CASE WHEN category=? THEN ? ELSE category END,
      description=CASE WHEN description=? THEN ? ELSE description END
      WHERE id=? AND ${gate}`).bind(update.oldName,update.name,update.oldCategory,update.category,update.oldDescription,update.description,update.id,marker)];
    for (const [field,change] of Object.entries(update.detailFields)) {
      const path=`$.${field}`;
      statements.push(db.prepare(`UPDATE products SET details_json=json_set(details_json,?,?) WHERE id=? AND json_extract(details_json,?) IS ? AND ${gate}`).bind(path,change.value,update.id,path,change.old,marker));
    }
    statements.push(db.prepare("INSERT OR IGNORE INTO store_meta (key,value) VALUES (?,'1')").bind(marker));
    await db.batch(statements);
  }
  await db.prepare('INSERT OR IGNORE INTO store_meta (key,value) VALUES (?,?)').bind(release,`${products.length} additional source designs; ${updates.length} completed galleries`).run();
}
