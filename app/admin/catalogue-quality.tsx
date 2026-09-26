"use client";
import {useMemo,useState} from 'react';
import type {AdminProduct} from '@/lib/store-db';
import {catalogueQuality,QUALITY_LABELS,type QualityIssue} from '@/lib/catalog-quality';

export function CatalogueQuality({products,onEdit}:{products:AdminProduct[];onEdit:(product:AdminProduct)=>void}) {
  const [filter,setFilter]=useState<QualityIssue|'all'>('all');
  const [page,setPage]=useState(0);
  const rows=useMemo(()=>catalogueQuality(products),[products]);
  const issues=rows.filter(row=>filter==='all'?row.issues.length:row.issues.includes(filter));
  const currentPage=Math.min(page,Math.max(0,Math.ceil(issues.length/20)-1));
  return <details className="vn-control-panel vn-quality">
    <summary>Catalogue review · {rows.filter(row=>row.issues.length).length} products to check</summary>
    <p>Complete confirmed product details before launch. Similar names are a review flag, not proof of a duplicate. Compare photographs before archiving; existing orders remain intact.</p>
    <label>Show <select value={filter} onChange={event=>{setFilter(event.target.value as QualityIssue|'all');setPage(0);}}><option value="all">All checks ({rows.filter(row=>row.issues.length).length})</option>{Object.entries(QUALITY_LABELS).map(([key,label])=><option key={key} value={key}>{label} ({rows.filter(row=>row.issues.includes(key as QualityIssue)).length})</option>)}</select></label>
    <ul>{issues.slice(currentPage*20,currentPage*20+20).map(({product,issues})=><li key={product.id}><button type="button" onClick={()=>onEdit(product)}><strong>{product.name}</strong><span>{product.details?.audience ?? 'unisex'} · {product.category}</span><small>{issues.map(issue=>QUALITY_LABELS[issue]).join(' · ')}</small></button></li>)}</ul>
    {!issues.length&&<p>No products need this check.</p>}
    {issues.length>20&&<div className="vn-control-actions"><button disabled={!currentPage} onClick={()=>setPage(currentPage-1)}>Previous</button><span>Page {currentPage+1} of {Math.ceil(issues.length/20)}</span><button disabled={(currentPage+1)*20>=issues.length} onClick={()=>setPage(currentPage+1)}>Next</button></div>}
  </details>;
}
