import manifest from '@/data/tech-pack-pdf-r07.json';
export type TechPackPDF={color:string;file:string;sha256:string;bytes:number;pages:number};
const entries:Record<string,TechPackPDF[]>=manifest;
export function garmentPDFs(id:string):TechPackPDF[]{return Object.hasOwn(entries,id)?entries[id]:[];}
export function garmentPDF(id:string,color:string|null){const rows=garmentPDFs(id);return color===null?(rows.length===1?rows[0]:null):rows.find(r=>r.color===color)||null;}
export function garmentPDFLink(id:string,color:string){return `/api/admin/tech-packs?id=${encodeURIComponent(id)}&format=pdf&color=${encodeURIComponent(color)}`;}
const esc=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderGarmentPDFs(product:{id:string;name:string}){
 const rows=garmentPDFs(product.id);
 return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(product.name)} — Tech packs</title><style>body{font:16px Arial;margin:32px auto;padding:0 20px;max-width:850px;color:#171717}li{padding:18px 0;border-bottom:1px solid #ddd}a{color:inherit}small,p{line-height:1.6}.notice{background:#f4f4f4;padding:16px}ul{padding-left:20px}</style></head><body><a href="/admin">← Admin</a><h1>${esc(product.name)}</h1><p class="notice">R07 · 15 October 2026 · Owner-approved specifications. Each PDF belongs to this garment and the colourway shown. Saved measurements, colourways, labels and packaging are approved. Physical sample checks, supplier details and test results remain recorded only where evidence is available. These saved PDFs do not automatically change when product details are edited.</p><ul>${rows.map(r=>`<li><a href="${esc(garmentPDFLink(product.id,r.color))}">${esc(r.color||'Default colourway')} — Download PDF</a><br><small>${r.pages} pages · ${(r.bytes/1048576).toFixed(1)} MB</small></li>`).join('')||'<li>No saved PDF is attached to this garment yet.</li>'}</ul><p><a href="/api/admin/tech-packs?id=${encodeURIComponent(product.id)}">Generate a pack from current product details</a></p></body></html>`;
}
