const r4Headers = {'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export function r4Attachments(details) {
  let value;
  try { value = typeof details === 'string' ? JSON.parse(details) : details; } catch { return []; }
  const rows = value?.manufacturingAttachments;
  if (!Array.isArray(rows)) return [];
  return rows.slice(0,20).filter(a => a && ['pdf','artwork'].includes(a.kind)
    && typeof a.key === 'string' && /^tech-packs\/r4-20261026\/[A-Za-z0-9_-]+\.(pdf|zip)$/.test(a.key)
    && a.file === a.key.split('/').pop()
    && ((a.kind === 'pdf' && a.file.endsWith('.pdf')) || (a.kind === 'artwork' && a.file.endsWith('.zip')))
    && Number.isSafeInteger(a.bytes) && a.bytes > 0 && a.bytes <= 5*1024*1024
    && typeof a.sha256 === 'string' && /^[a-f0-9]{64}$/.test(a.sha256)
    && typeof a.color === 'string');
}
export function r4PDFs(details) {return r4Attachments(details).filter(a=>a.kind==='pdf');}
export function r4Pick(details,format,color,file) {
  const rows=r4Attachments(details);
  if(format==='asset')return rows.find(a=>a.file===file)||null;
  const pdfs=rows.filter(a=>a.kind==='pdf');
  return color===null ? (pdfs.length===1?pdfs[0]:null) : pdfs.find(a=>a.color===color)||null;
}
const r4Escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function r4Files(product) {
  const rows=r4Attachments(product.details_json);
  if(!rows.length)return null;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${r4Escape(product.name)} - Manufacturer files</title><style>body{font:16px/1.6 system-ui;margin:32px auto;padding:0 20px;max-width:850px;color:#171717}h1{line-height:1.2}li{padding:18px 0;border-bottom:1px solid #ddd}a{color:inherit}.notice{background:#f4f4f4;padding:16px}small{display:block}ul{padding-left:20px}</style></head><body><a href="/admin">Back to admin</a><h1>${r4Escape(product.name)}</h1><p class="notice">R4 - Sampling design specifications. Physical sample, fit, materials, native decorative artwork and production release remain subject to the evidence listed in the pack. Each download belongs to this garment. Saved files do not change automatically when product fields are edited.</p><ul>${rows.map(a=>`<li><a href="/api/admin/tech-packs?id=${encodeURIComponent(product.id)}&amp;format=asset&amp;file=${encodeURIComponent(a.file)}">${a.kind==='pdf'?'Download tech-pack PDF':'Download artwork and measurement files'}</a><small>${r4Escape(a.color)} - ${a.kind==='pdf'?r4Escape(a.pages)+' pages - ':''}${(a.bytes/1048576).toFixed(2)} MB</small></li>`).join('')}</ul><p><a href="/api/admin/tech-packs?id=${encodeURIComponent(product.id)}">View current saved product details</a></p></body></html>`;
}
export async function r4Serve(bucket,record) {
  if(!record)return Response.json({error:'Attachment not found for this garment.'},{status:404,headers:r4Headers});
  if(!bucket)return Response.json({error:'Attachment storage is unavailable.'},{status:503,headers:r4Headers});
  const object=await bucket.get(record.key);
  if(!object||object.size!==record.bytes||object.size>5*1024*1024)return Response.json({error:'Attachment verification failed.'},{status:503,headers:r4Headers});
  const bytes=await object.arrayBuffer();
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(bytes.byteLength!==record.bytes||digest!==record.sha256)return Response.json({error:'Attachment verification failed.'},{status:503,headers:r4Headers});
  return new Response(bytes,{headers:{...r4Headers,'Content-Type':record.kind==='pdf'?'application/pdf':'application/zip','Content-Length':String(record.bytes),'Content-Disposition':`attachment; filename="${record.file}"`}});
}
