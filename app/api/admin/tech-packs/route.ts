import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {getDbBinding} from '@/lib/runtime-env';
import {buildTechPack,renderTechPackHTML} from '@/lib/tech-packs.mjs';

export const dynamic = 'force-dynamic';
const headers = {'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request) {
  const auth = await adminAuthStateFromRequest(request);
  if (!auth.ok) return Response.json({error:auth.error},{status:auth.status,headers});
  const url = new URL(request.url), db = getDbBinding();
  try {
    const id=url.searchParams.get('id');
    if (id) {
      const product=await db.prepare('SELECT id,name,slug,category,image_url,image_alt,details_json,updated_at FROM products WHERE id = ?').bind(id).first();
      if (!product) return Response.json({error:'Garment not found.'},{status:404,headers});
      const [images,variants]=await Promise.all([
        db.prepare('SELECT product_id,image_url,image_alt,color,sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order,id').bind(id).all(),
        db.prepare('SELECT product_id,sku,size,color FROM product_variants WHERE product_id = ? ORDER BY color,size').bind(id).all()
      ]);
      const pack=buildTechPack(product,images.results,variants.results);
      if(url.searchParams.get('format')==='json')return Response.json(pack,{headers});
      return new Response(renderTechPackHTML(pack),{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; img-src 'self' https://api.vantanoir.store https://vantanoir.store https://www.vantanoir.store; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'"}});
    }
    const q=(url.searchParams.get('q')||'').trim().slice(0,160);
    const page=Math.max(1,Math.min(100000,Number.parseInt(url.searchParams.get('page')||'1',10)||1));
    const pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
    const where="WHERE p.name LIKE ? ESCAPE '\\' OR p.id LIKE ? ESCAPE '\\' OR p.category LIKE ? ESCAPE '\\' OR EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.sku LIKE ? ESCAPE '\\')";
    const args=[pattern,pattern,pattern,pattern];
    const [count,rows]=await Promise.all([
      db.prepare(`SELECT COUNT(*) AS total FROM products p ${where}`).bind(...args).first<{total:number}>(),
      db.prepare(`SELECT p.id,p.name,p.category,p.status,p.updated_at FROM products p ${where} ORDER BY p.name,p.id LIMIT 30 OFFSET ?`).bind(...args,(page-1)*30).all()
    ]);
    return Response.json({products:rows.results,total:count?.total||0,page,pageSize:30},{headers});
  } catch {return Response.json({error:'Tech packs could not be loaded. Please retry.'},{status:500,headers});}
}
