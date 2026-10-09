'use client';
import {useMemo,useRef,useState} from 'react';
import {parseStock,matchesStockFilter,stockTotals,type InventoryRow,type StockFilter} from '@/lib/admin-inventory';
import {useUnsavedChanges,useAdminNavigation} from './unsaved-changes';
import {toast} from 'sonner';
type Feedback={text:string;error?:boolean};
export function InventoryPanel({rows,onSaved,onHistory,initialFilter='available',threshold=3}:{threshold?:number;initialFilter?:StockFilter;rows:InventoryRow[];onSaved:(row:InventoryRow)=>void;onHistory:()=>void}){
 const [drafts,setDrafts]=useState<Record<string,string>>({}),[feedback,setFeedback]=useState<Record<string,Feedback>>({}),[saving,setSaving]=useState<Record<string,boolean>>({});
 const [editing,setEditing]=useState<Record<string,boolean>>({});
 const batchLock=useRef(false),[batchSaving,setBatchSaving]=useState(false);
 const locks=useRef(new Set<string>()),[query,setQuery]=useState(''),[filter,setFilter]=useState<StockFilter>(initialFilter),[page,setPage]=useState(1),[grouped,setGrouped]=useState(false);
 const navigate=useAdminNavigation(),totals=stockTotals(rows,threshold),dirtyRows=rows.filter(r=>drafts[r.id]!==undefined&&drafts[r.id]!==String(r.stock));
 const matching=useMemo(()=>rows.filter(r=>matchesStockFilter(r,filter,threshold)&&[r.productName,r.color,r.size,r.sku].join(' ').toLowerCase().includes(query.trim().toLowerCase())),[rows,query,filter,threshold]);
 const groups=Array.from(matching.reduce((m,r)=>{const g=m.get(r.productId)||{name:r.productName,stock:0,reserved:0,available:0,variants:0};g.stock+=r.stock;g.reserved+=r.reserved;g.available+=r.available;g.variants++;m.set(r.productId,g);return m;},new Map<string,{name:string;stock:number;reserved:number;available:number;variants:number}>()).values());
 const pages=Math.max(1,Math.ceil((grouped?groups.length:matching.length)/50)),currentPage=Math.min(page,pages);
 async function saveRow(row:InventoryRow){
  if(locks.current.has(row.id))return false;
  const entered=drafts[row.id]??String(row.stock),stock=parseStock(entered);
  if(stock===null||stock<row.reserved){setFeedback(f=>({...f,[row.id]:{error:true,text:stock===null?'Enter a whole quantity from 0 to 100,000.':`At least ${row.reserved} units are reserved.`}}));return false;}
  if(stock===row.stock){setEditing(e=>({...e,[row.id]:false}));setDrafts(d=>{const next={...d};delete next[row.id];return next;});return true;}
  locks.current.add(row.id);setSaving(s=>({...s,[row.id]:true}));setFeedback(f=>({...f,[row.id]:{text:'Saving…'}}));
  try{
   const response=await fetch('/api/admin/inventory',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({variantId:row.id,stock,expectedStock:row.stock}),signal:AbortSignal.timeout(30000)});
   const result=await response.json() as {row?:InventoryRow;error?:string};
   if(!response.ok||!result.row)throw new Error(result.error||'Could not confirm this save. Refresh to check the recorded quantity.');
   const saved=result.row;onSaved(saved);setEditing(e=>({...e,[row.id]:false}));setDrafts(d=>{const next={...d};delete next[row.id];return next;});
   setFeedback(f=>({...f,[row.id]:{text:`Saved ✓ ${saved.stock} on hand · ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`}}));return true;
  }catch(e){setFeedback(f=>({...f,[row.id]:{error:true,text:e instanceof Error?e.message:'Could not save. Your entry is kept.'}}));return false;}
  finally{locks.current.delete(row.id);setSaving(s=>({...s,[row.id]:false}));}
 }
 async function saveAll(){if(batchLock.current)return false;batchLock.current=true;setBatchSaving(true);try{let ok=true;for(const row of dirtyRows)if(!await saveRow(row))ok=false;if(ok)toast.success('All stock changes saved.');return ok;}finally{batchLock.current=false;setBatchSaving(false);}}
 useUnsavedChanges({name:'Inventory',dirty:dirtyRows.length>0,busy:batchSaving||Object.values(saving).some(Boolean),save:saveAll,discard:()=>{setDrafts({});setFeedback({});setEditing({});}});
 return <section className="vn-inventory-panel" aria-label="Available stock"><h2 className="text-3xl">Available stock</h2><p>Saved quantities for published, active variations. On hand includes checkout reservations; available is on hand minus reserved. Draft and archived stock is excluded from these totals.</p>
 <p>Visibility and stock are separate. Drafts and archived garments are hidden from the store. Published garments with zero available units cannot be purchased. Enter real quantities below and save; restore archived products in Products → Archived → Restore draft, then publish when ready.</p><div className="vn-inventory-summary">{[['On hand',totals.onHand],['Reserved',totals.reserved],['Available to sell',totals.available],['Low-stock variations',totals.low],['Zero-stock variations',totals.out]].map(([label,n])=><div key={label}><strong>{n}</strong>{label}</div>)}</div>
 <div className="vn-inventory-actions"><input className="vn-option-select" aria-label="Search inventory" placeholder="Product, colour, size or SKU" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/><button className="vn-pill" onClick={onHistory}>Stock history</button><button className="vn-pill" disabled={!dirtyRows.length||batchSaving||Object.values(saving).some(Boolean)} onClick={()=>void saveAll()}>Save {dirtyRows.length||''} changed rows</button><button className="vn-pill" onClick={()=>{setGrouped(!grouped);setPage(1);}}>{grouped?'Show colour & size rows':'Show product totals'}</button></div>
 <div className="vn-inventory-filters">{([['available','Available'],['low',`Low stock (1–${threshold})`],['out','Zero stock'],['archived','Archived / disabled'],['all','All, including drafts']] as [StockFilter,string][]).map(([key,label])=><button className="vn-pill" key={key} aria-pressed={filter===key} onClick={()=>{setFilter(key);setPage(1);}}>{label}</button>)}</div>
 <p role="status">{dirtyRows.length?`${dirtyRows.length} unsaved row(s). Totals above still show saved quantities.`:'All stock changes saved.'} Enter the total on hand: if you have 3 and receive 5, enter 8.</p>
 <div className="vn-inventory-actions mt-5"><button className="vn-pill" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>Previous stock page</button><span>{grouped?groups.length:matching.length} {grouped?'products':'variations'} · Page {currentPage} of {pages}</span><button className="vn-pill" disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}>Next stock page</button></div>
 <div className="overflow-x-auto"><table className="vn-inventory-table"><thead><tr><th>Product</th>{grouped?<th>Variations</th>:<><th>Colour / size</th><th>Status</th></>}<th>On hand</th><th>Reserved</th><th>Available</th>{!grouped&&<th>Update total on hand</th>}</tr></thead><tbody>
 {grouped?groups.slice((currentPage-1)*50,currentPage*50).map(g=><tr key={g.name}><td>{g.name}</td><td>{g.variants}</td><td>{g.stock}</td><td>{g.reserved}</td><td>{g.available}</td></tr>):matching.slice((currentPage-1)*50,currentPage*50).map(row=>{const draft=drafts[row.id]??String(row.stock),dirty=draft!==String(row.stock),parsed=parseStock(draft),status=feedback[row.id];return <tr key={row.id} onDoubleClick={()=>{if(!batchSaving&&!saving[row.id])setEditing(e=>({...e,[row.id]:true}));}}><td>{row.productName}<small>{row.sku}</small></td><td>{row.color} / {row.size}</td><td>{row.active?row.productStatus:'inactive'}</td><td>{row.stock}</td><td>{row.reserved}</td><td>{row.available}</td><td><div className="vn-inventory-actions"><input aria-label={`${row.productName} ${row.color} ${row.size} total on hand`} inputMode="numeric" type="text" readOnly={!editing[row.id]} value={draft} disabled={batchSaving||!!saving[row.id]||!row.active||row.productStatus==='archived'} onChange={e=>{setDrafts(d=>({...d,[row.id]:e.target.value}));setFeedback(f=>({...f,[row.id]:{text:'Unsaved changes'}}));}}/><button className="vn-pill" disabled={batchSaving||!!saving[row.id]||(!!editing[row.id]&&(parsed===null||parsed<row.reserved))||!row.active||row.productStatus==='archived'} onClick={()=>editing[row.id]?void saveRow(row):setEditing(e=>({...e,[row.id]:true}))}>{saving[row.id]?'Saving…':editing[row.id]?'Save':'Edit'}</button></div><p role={status?.error?'alert':'status'} className={`vn-inventory-feedback ${status?.error?'is-error':''}`}>{dirty&&parsed===null?'Enter a whole quantity from 0 to 100,000.':dirty&&parsed!==null&&parsed<row.reserved?`At least ${row.reserved} units are reserved.`:status?.text||'Saved quantity'}</p></td></tr>})}
 </tbody></table>{!matching.length&&<p>No variations match this view. Use All or change your search.</p>}</div>

 </section>;
}
