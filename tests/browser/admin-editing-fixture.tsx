import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../app/globals.css';
import '../../app/admin/admin-appearance.css';
import {adminThemeCSS} from '../../lib/admin-theme-css';
const style=document.createElement('style');style.textContent=adminThemeCSS;document.head.appendChild(style);document.documentElement.dataset.vnAdminTheme='light';
import {TerminalPickup} from '../../app/admin/terminal-pickup';
import {CommercePanel} from '../../app/admin/commerce-panel';
import {RecordEditor} from '../../app/admin/record-editor';
import {OperationsPanel} from '../../app/admin/operations-panel';
import {UnsavedChangesProvider,useAdminNavigation} from '../../app/admin/unsaved-changes';
import {defaultCommerceSettings} from '../../lib/commerce-config';
let pickup={details:{line1:'10 Test Street',line2:'',city:'Kaduna',state:'Kaduna',country:'NG',first_name:'Test',last_name:'Owner',phone:'08000000001',email:'test@example.com',zip:'800001'},revision:'1',updatedAt:'2026-10-09T00:00:00Z'};
let settings=defaultCommerceSettings(),priceKobo=1000000;
(window as any).__writes=[];
(window as any).__act=React.act;
window.fetch=async(input:any,init?:RequestInit)=>{
 const url=String(input),writing=init?.method&&init.method!=='GET',body=init?.body?JSON.parse(String(init.body)):{};
 if(writing){(window as any).__writes.push({url,body});if((window as any).__fail)return Response.json({error:'Test save failed'},{status:503});}
 if(url.includes('terminal-pickup')){if(writing)pickup={...pickup,details:body.details,revision:'2'};return Response.json({pickup});}
 if(url.includes('/commerce')){if(writing)settings=body.action==='settings-section'?{...settings,...body.settings.values}:body.settings;return Response.json({settings,setupIssues:[],reviews:[],returns:[],emails:[],subscribers:[],stock:[],hasMore:false});}
 if(url.includes('/operations')){if(writing){priceKobo=body.data[0].priceKobo;return Response.json({result:[{id:'test',ok:true}]});}return Response.json({products:[{id:'test',name:'Test garment',priceKobo,status:'draft',variants:[]}]});}
 return Response.json({});
};
function IndependentEditors(){return <>{['First record','Second record'].map(name=><RecordEditor key={name} name={name} initialValue={{text:'Original'}} onSave={async value=>{(window as any).__writes.push({name,value});return !(window as any).__fail;}}>{(v,set)=><label>{name}<input aria-label={name} required value={v.text} onChange={e=>set({text:e.target.value})}/></label>}</RecordEditor>)}</>;}
function Screen(){const [tab,setTab]=useState('pickup'),navigate=useAdminNavigation();return <main className="vn-control-center vn-exact" style={{padding:20}}><nav>{['pickup','settings','prices','independent','exit'].map(t=><button key={t} onClick={()=>navigate(()=>setTab(t))}>{t}</button>)}</nav>{tab==='pickup'?<TerminalPickup/>:tab==='settings'?<CommercePanel view="settings"/>:tab==='prices'?<OperationsPanel role="owner" initialSection="bulk"/>:tab==='independent'?<IndependentEditors/>:<h1>Exited</h1>}</main>;}
const root=createRoot(document.getElementById('root')!);(window as any).__unmount=()=>root.unmount();root.render(<UnsavedChangesProvider><Screen/></UnsavedChangesProvider>);
