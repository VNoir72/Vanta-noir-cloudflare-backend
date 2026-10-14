'use client';
import {useState,type ReactNode} from 'react';
import {Store,Truck,CreditCard,Monitor,FileText,Users,Link2,ChevronRight,ArrowLeft} from 'lucide-react';
import type {AdminTarget} from './management-tools';
import type {SettingsSection} from '@/lib/settings-sections';
import {useAdminNavigation} from './unsaved-changes';
const tiles=[
 {title:'Business details',note:'VANTA NOIR · Contact and order processing',Icon:Store,sections:['support','checkout']},
 {title:'Shipping & pickup',note:'Pickup, dispatch and worldwide delivery',Icon:Truck,sections:['international','fulfilment']},
 {title:'Payments',note:'Payment methods and connection status',Icon:CreditCard,sections:[]},
 {title:'Website design',note:'Brand accent, hero and storefront controls',Icon:Monitor,sections:['design']},
 {title:'Policies',note:'Returns, refunds and delivery policy',Icon:FileText,sections:['returns','fulfilment']},
 {title:'Staff & permissions',note:'Team members and owner approvals',Icon:Users,sections:[]},
 {title:'Connections',note:'Payments, analytics and email services',Icon:Link2,sections:[]}
] as const;
export function SettingsWorkspace({children,connections,onNavigate}:{children:(sections:readonly SettingsSection[])=>ReactNode;connections:ReactNode;onNavigate:(target:AdminTarget)=>void}){
 const [active,setActive]=useState<number|null>(null),navigate=useAdminNavigation();
 const tile=active===null?null:tiles[active];
 return <div className="vn-settings-workspace">{!tile?<div className="vn-settings-card-grid">{tiles.map(({title,note,Icon},index)=><button key={title} className="vn-settings-tile" onClick={()=>title==='Staff & permissions'?onNavigate({section:'staff'}):navigate(()=>setActive(index))}><Icon size={23}/><span><strong>{title}</strong><small>{note}</small></span><ChevronRight size={17}/></button>)}</div>:<><button className="vn-small-button" onClick={()=>navigate(()=>setActive(null))}><ArrowLeft size={15}/> All settings</button><h2 className="vn-settings-view-title">{tile.title}</h2></>}<div hidden={!tile||tile.sections.length===0}>{children(tile?.sections??[])}</div><div hidden={!tile||tile.sections.length!==0}>{connections}</div>{tile?.title==='Shipping & pickup'&&<button className="vn-small-button" onClick={()=>onNavigate({section:'delivery'})}>Manage couriers & pickup <ChevronRight size={15}/></button>}</div>
}
