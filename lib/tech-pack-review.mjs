export function labelInstruction(details) {
 const labels=typeof details?.labels==='string'?details.labels:'';
 if(/no sewn labels|no neck|packaging label/i.test(labels))return 'Use the style-specific label specification; garment size-tab dimensions do not apply automatically.';
 const match=labels.match(/size\s+(?:tab|label)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*mm/i);
 return match?`Size tab ${match[1]} × ${match[2]} mm finished; follow the saved insertion/fold allowance.`:'Use the finished size and allowances in the style-specific label specification; obtain a dimensioned label proof if absent.';
}
export function artworkRows(details) {
 const rows=Array.isArray(details?.artworkApplications)?details.artworkApplications:[];
 return rows.slice(0,20).filter(x=>x&&typeof x.position==='string').map(x=>[x.position,String(x.dimensions||'See style artwork lock'),x.position,String(x.method||'See style artwork lock')]);
}
export function visualReviewText(details) {
 const r=details?.visualReview;
 if(!r||!(r.status==='needs-reconciliation'||r.corrections?.length))return '';
 return [r.revision,r.scope,r.notes,r.corrections?.length?'Corrected fields: '+r.corrections.join(', '):'',r.savedPDFNotice,'This review does not certify hidden construction, exact artwork or physical fit. Resolve identified conflicts before production.'].filter(Boolean).join('\n');
}
