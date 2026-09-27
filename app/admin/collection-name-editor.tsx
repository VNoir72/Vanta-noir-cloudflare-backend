'use client';
import { useState } from 'react';
import type { CommerceSettings } from '@/lib/commerce-config';
import type { AdminProduct } from '@/lib/store-db';
import { shopperCollectionLabel } from '@/lib/catalog-search';

export function CollectionNameEditor({settings,onChange,busy}:{settings:CommerceSettings;onChange:(value:CommerceSettings)=>void;busy:boolean}) {
  const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const [products,setProducts]=useState<AdminProduct[]>([]);
  const [query,setQuery]=useState(''),[selected,setSelected]=useState(''),[name,setName]=useState(''),[notice,setNotice]=useState('');
  const label=(source:string)=>shopperCollectionLabel(source,settings.collectionLabels);
  async function load() {
    setLoading(true);setError('');
    try {
      const response=await fetch('/api/admin/products',{cache:'no-store',signal:AbortSignal.timeout(30000)});
      if(!response.ok)throw new Error('Your clothing could not be loaded. Please retry.');
      const data=await response.json() as {products:AdminProduct[]};
      if(!Array.isArray(data.products))throw new Error('Your clothing could not be loaded. Please retry.');
      setProducts(data.products);
    }catch(e){setError(e instanceof Error?e.message:'Please retry.');}finally{setLoading(false);}
  }
  function select(source:string){setSelected(source);setName(label(source));setNotice('');}
  const sources=[...new Set([...products.map(p=>p.details?.collection||''),...settings.collectionLabels.map(r=>r.source)].filter(Boolean))].sort();
  const visible=products.filter(p=>`${p.name} ${p.details?.collection||''} ${p.details?.collection?label(p.details.collection):''}`.toLowerCase().includes(query.trim().toLowerCase()));
  function apply(){
    if(!selected||!name.trim())return;
    const exists=settings.collectionLabels.some(r=>r.source===selected);
    if(!exists&&settings.collectionLabels.length>=100){setNotice('The collection name limit has been reached. Edit an existing name.');return;}
    onChange({...settings,collectionLabels:exists?settings.collectionLabels.map(r=>r.source===selected?{...r,label:name.trim()}:r):[...settings.collectionLabels,{source:selected,label:name.trim()}]});
    setNotice('Name updated in this form. Select Save settings below to publish it.');
  }
  return <section aria-label="Collection names">
    <h3>Customer-facing collection names</h3>
    <p>Choose a collection to rename it for every item in that collection.</p>
    <button type="button" className="vn-pill" disabled={busy} aria-expanded={open} aria-controls="collection-name-table" onClick={()=>{setOpen(!open);if(!open)void load();}}>Rename a collection</button>
    {open&&<div id="collection-name-table">
      {loading?<p role="status">Loading your clothing…</p>:error?<div role="alert"><p>{error}</p><button type="button" onClick={()=>void load()}>Retry</button></div>:<>
        <label>Select a collection<select value={selected} onChange={e=>select(e.target.value)}><option value="">Choose a collection</option>{sources.map(source=><option key={source} value={source}>{label(source)}{label(source)!==source?` — ${source}`:''}</option>)}</select></label>
        {selected&&<fieldset disabled={busy} className="vn-product-disclosure"><legend>Rename selected collection</legend><div className="vn-admin-fields">
          <label>Original collection name<input readOnly value={selected}/></label>
          <label>Current name buyers see<input readOnly value={label(selected)}/></label>
          <label>New collection name<input maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Enter the new name"/></label>
        </div><p>This changes the name for all clothing in this collection.</p><button type="button" className="vn-pill" disabled={!name.trim()||name.trim()===label(selected)} onClick={apply}>Apply new name</button></fieldset>}
        {notice&&<p role="status">{notice}</p>}
        <label>Find clothing or a collection<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search clothing or collection"/></label>
        <div style={{overflowX:'auto',maxHeight:480,overflowY:'auto'}} tabIndex={0} aria-label="Clothing and their collections"><table className="vn-data-table"><thead><tr><th>Clothing</th><th>Original collection</th><th>Name buyers see</th><th>Select collection</th></tr></thead><tbody>{visible.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.details?.collection||'Unassigned'}</td><td>{p.details?.collection?label(p.details.collection):'—'}</td><td>{p.details?.collection?<button type="button" className="vn-pill" aria-pressed={selected===p.details.collection} onClick={()=>select(p.details!.collection!)}>Select</button>:<span>Assign under Products</span>}</td></tr>)}</tbody></table></div>
        {!visible.length&&<p>{products.length?'No matching clothing.':'No clothing has been added yet.'}</p>}
      </>}
    </div>}
  </section>;
}
