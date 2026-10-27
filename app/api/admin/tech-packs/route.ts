import {r4Attachments,r4PDFs,r4Pick,r4Files,r4Serve} from '@/lib/stored-tech-pack-attachments.mjs';
import {standardPDF} from '@/lib/manufacturer-standard-pdf.mjs';
import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {garmentPDFs,garmentPDF,renderGarmentPDFs} from '@/lib/tech-pack-pdf-attachments';
import {runtimeEnv} from '@/lib/runtime-env';
import {getDbBinding} from '@/lib/runtime-env';
import {buildTechPack,renderTechPackHTML} from '@/lib/tech-packs.mjs';

export const dynamic = 'force-dynamic';
const headers = {'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request) {
  const auth = await adminAuthStateFromRequest(request);
  if (!auth.ok) return Response.json({error:auth.error},{status:auth.status,headers});
  const url = new URL(request.url);
  if(url.searchParams.get('standard')==='1')return new Response(Uint8Array.from(atob(standardPDF),c=>c.charCodeAt(0)),{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':'inline; filename=Vanta-Noir-Manufacturer-Sizing-Standard-R1.pdf'}});
  const db = getDbBinding();
  try {
    const id=url.searchParams.get('id');
    if (id) {
      const product=await db.prepare('SELECT id,name,slug,category,image_url,image_alt,details_json,updated_at FROM products WHERE id = ?').bind(id).first();
      if (!product) return Response.json({error:'Garment not found.'},{status:404,headers});
      const format=url.searchParams.get('format');
      if(format==='asset'||(format==='pdf'&&r4PDFs(product.details_json).length))return r4Serve(runtimeEnv().BUCKET,r4Pick(product.details_json,format,url.searchParams.get('color'),url.searchParams.get('file')));
      if(format==='legacy-files')return new Response(renderGarmentPDFs(product as {id:string;name:string}),{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'"}});
      if(format==='files')return new Response(r4Files(product)||renderGarmentPDFs(product as {id:string;name:string}),{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'"}});
      if(format==='attachments')return Response.json({id,pdfs:r4PDFs(product.details_json).length?r4PDFs(product.details_json):garmentPDFs(id),assets:r4Attachments(product.details_json),revision:r4Attachments(product.details_json).length?'R4':'R07',status:r4Attachments(product.details_json).length?'sampling design targets; physical validation pending':'owner-approved specifications'},{headers});
      if(format==='pdf'){
        const pdf=garmentPDF(id,url.searchParams.get('color'));
        if(!pdf)return Response.json({error:'Choose a saved colourway for this garment.'},{status:404,headers});
        const bucket=runtimeEnv().BUCKET;
        if(!bucket)return Response.json({error:'PDF storage is unavailable.'},{status:503,headers});
        const object=await bucket.get('tech-packs/r07-20261015/'+pdf.file);
        if(!object||object.size!==pdf.bytes||object.customMetadata?.sha256!==pdf.sha256)return Response.json({error:'This PDF is unavailable. Please retry later.'},{status:503,headers});
        return new Response(object.body,{headers:{...headers,'Content-Type':'application/pdf','Content-Length':String(object.size),'Content-Disposition':`attachment; filename="${pdf.file}"`}});
      }
      const [images,variants]=await Promise.all([
        db.prepare('SELECT product_id,image_url,image_alt,color,sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order,id').bind(id).all(),
        db.prepare('SELECT product_id,sku,size,color FROM product_variants WHERE product_id = ? ORDER BY color,size').bind(id).all()
      ]);
      const pack=buildTechPack(product,images.results,variants.results,{color:url.searchParams.get('color')||''});
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
      db.prepare(`SELECT p.id,p.name,p.category,p.status,p.updated_at,p.details_json FROM products p ${where} ORDER BY p.name,p.id LIMIT 30 OFFSET ?`).bind(...args,(page-1)*30).all()
    ]);
    return Response.json({products:rows.results.map(({details_json,...p})=>({...p,pdfs:r4PDFs(details_json).length?r4PDFs(details_json):garmentPDFs(String(p.id))})),total:count?.total||0,page,pageSize:30},{headers});
  } catch {return Response.json({error:'Tech packs could not be loaded. Please retry.'},{status:500,headers});}
}

