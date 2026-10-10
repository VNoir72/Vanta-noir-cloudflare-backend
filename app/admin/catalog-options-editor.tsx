'use client';
import {MeasurementLibrary} from './measurement-library';
import {useState} from 'react';
import {SHOP_SECTIONS} from '@/lib/shop-categories';
import {defaultOptions} from '@/lib/catalog-options';
import {RecordEditor} from './record-editor';
import {useAdminNavigation} from './unsaved-changes';
type Option={kind:'color'|'category';name:string;hex:string;section:string};
export function CatalogOptionsEditor({options,onChange}:{options:typeof defaultOptions;onChange:(v:typeof defaultOptions)=>void}){
 const [selected,setSelected]=useState<Option>({kind:'category',name:'',hex:'#101112',section:'Tops'}),[message,setMessage]=useState('');const navigate=useAdminNavigation();
 return <section className="vn-control-panel"><h2>Add categories &amp; colours</h2><p>Add a reusable colour or category, or select a saved option below to edit it.</p>
 <RecordEditor initialEditing name="Category or colour" initialValue={selected} onSave={async value=>{const r=await fetch('/api/admin/catalog-options',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value),signal:AbortSignal.timeout(20000)});const result=await r.json() as typeof defaultOptions&{error?:string};if(!r.ok)throw Error(result.error||'Could not save');onChange(result);setSelected(value);setMessage('Saved. Available in Product Studio.');return true;}}>{(v,set)=><div className="vn-admin-fields"><label>Option type<select value={v.kind} onChange={e=>set({...v,kind:e.target.value as Option['kind']})}><option value="category">Category</option><option value="color">Colour</option></select></label><label>Name<input required value={v.name} maxLength={v.kind==='color'?60:100} onChange={e=>set({...v,name:e.target.value})}/></label>{v.kind==='color'?<label>Swatch<input type="color" value={v.hex} onChange={e=>set({...v,hex:e.target.value})}/></label>:<label>Store department<select value={v.section} onChange={e=>set({...v,section:e.target.value})}>{SHOP_SECTIONS.map(s=><option key={s}>{s}</option>)}</select></label>}</div>}</RecordEditor>
 <p role="status">{message}</p><details><summary>{options.colors.length} colours · {options.categories.length} categories</summary><div className="vn-option-list">{options.colors.map(c=><button key={'color-'+c.name} onClick={()=>navigate(()=>setSelected({kind:'color',name:c.name,hex:c.hex,section:'Tops'}))}><i style={{background:c.hex}}/>{c.name}</button>)}{options.categories.map(c=><button key={'category-'+c.id} onClick={()=>navigate(()=>setSelected({kind:'category',name:c.name,section:c.section,hex:'#101112'}))}>{c.name} · {c.section}</button>)}</div></details><MeasurementLibrary/></section>;
}
