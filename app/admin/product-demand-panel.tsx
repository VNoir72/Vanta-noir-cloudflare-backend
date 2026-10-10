'use client';
import {useEffect,useState} from 'react';
import {adminRead} from '@/lib/admin-read';
import type {DemandRow} from '@/lib/product-demand';
export function ProductDemandPanel(){
 const [rows,setRows]=useState<DemandRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[sort,setSort]=useState('likes');
 async function load(){setLoading(true);try{const data=await adminRead<{products:DemandRow[]}>('/api/admin/product-demand',d=>Array.isArray(d?.products),{timeoutMs:15000});setRows(data.products);setError('');}catch(e){setError(e instanceof Error?e.message:'Could not load product interest.');}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 const ranked=[...rows].sort((a,b)=>sort==='alerts'?b.confirmedAlerts-a.confirmedAlerts||b.likes-a.likes:b.likes-a.likes||b.confirmedAlerts-a.confirmedAlerts);
 return <section className="vn-control-panel vn-demand-panel" aria-labelledby="product-demand-title">
 <div className="vn-demand-heading"><h2 id="product-demand-title">What customers want</h2><button type="button" className="vn-pill" onClick={load} disabled={loading}>{loading?'Loading…':'Refresh interest'}</button></div>
 <p><strong>{rows.filter(p=>p.launchGroup==='Launch').length} launch selections · {rows.filter(p=>p.status==='published'&&p.availability!=='preview'&&p.priceStatus==='approved'&&p.stock>0).length} available to order · {rows.filter(p=>p.status==='published'&&p.launchGroup==='Preview').length} preview designs</strong></p>
 <p>Rank designs before deciding what to produce. Hearts count once per browser per product, even when several colours are saved. Unsaving removes the vote. Clearing browser storage or using another device can create another vote.</p>
 <p>Confirmed alerts count verified email addresses; pending requests are shown separately. Interest is not a paid order or guaranteed demand. Tracking starts with this update; older local favourites are counted when saved again.</p>
 <label>Rank by <select value={sort} onChange={e=>setSort(e.target.value)}><option value="likes">Most liked</option><option value="alerts">Confirmed alerts</option></select></label>
 {error&&<p role="alert">{error}</p>}
 <div className="vn-demand-scroll" tabIndex={0} role="region" aria-label="Product demand ranking"><table className="vn-data-table"><thead><tr><th>Rank / product</th><th>Status</th><th>Likes</th><th>New / 30 days</th><th>Confirmed alerts</th><th>Pending alerts</th><th>Colour &amp; size interest</th></tr></thead><tbody>{ranked.map((p,i)=><tr key={p.productId}><td><strong>{i+1}. {p.name.replace(/^\d+\s+/,'')}</strong></td><td>{p.status!=='published'?(p.launchGroup==='Launch'?'Launch pending — stock/review':'Hidden'):p.availability==='preview'||p.priceStatus!=='approved'?'Preview':p.stock>0?'Available to order':'Needs stock'}</td><td>{p.likes}</td><td>{p.recentLikes}</td><td>{p.confirmedAlerts}</td><td>{p.pendingAlerts}</td><td>{p.preferences.length?<details><summary>{p.preferences.length} preference groups</summary><ul>{p.preferences.map(v=><li key={v.color+':'+v.size}>{v.color} · {v.size||'Size not selected'}: {v.likes}</li>)}</ul></details>:'No votes yet'}</td></tr>)}</tbody></table></div>
 {!loading&&!error&&rows.length===0&&<p>No published designs or recorded likes yet.</p>}
 </section>;
}
