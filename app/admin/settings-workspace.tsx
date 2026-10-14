'use client';
import {useState} from 'react';
import {Building2,Truck,CreditCard,Palette,FileText,Link,Users,ShoppingBag} from 'lucide-react';
import {CommercePanel} from './commerce-panel';
import {IntegrationStatus} from './management-tools';
import {useAdminNavigation} from './unsaved-changes';
const groups=[{id:'business',name:'Business details',Icon:Building2,sections:['support'] as const},{id:'shipping',name:'Shipping & pickup',Icon:Truck,sections:['international','fulfilment'] as const},{id:'payments',name:'Payments',Icon:CreditCard,sections:[] as const},{id:'design',name:'Website design',Icon:Palette,sections:['design'] as const},{id:'policies',name:'Policies',Icon:FileText,sections:['returns'] as const},{id:'checkout',name:'Checkout & inventory',Icon:ShoppingBag,sections:['checkout'] as const},{id:'connections',name:'Connections',Icon:Link,sections:[] as const},{id:'staff',name:'Staff & permissions',Icon:Users,sections:[] as const}];
export function SettingsWorkspace({onNavigate,onThreshold}:{onNavigate:(target:{section:string;resource?:string})=>void;onThreshold:(n:number)=>void}){
 const [active,setActive]=useState('business'),navigate=useAdminNavigation();const group=groups.find(g=>g.id===active)!;
 return <section className="vn-settings-workspace"><header><h2>Store settings</h2><p>Manage your store preferences and configuration.</p></header><div className="vn-settings-layout"><nav aria-label="Store settings categories">{groups.map(({id,name,Icon})=><button key={id} aria-current={active===id?'page':undefined} onClick={()=>navigate(()=>id==='staff'?onNavigate({section:'staff'}):setActive(id))}><Icon size={20}/>{name}</button>)}</nav><div className="vn-settings-content"><h3>{group.name}</h3>{group.sections.length>0&&<CommercePanel key={active} view="settings" visibleSections={group.sections} onNavigate={onNavigate} onThreshold={onThreshold}/>} {['payments','connections'].includes(active)&&<IntegrationStatus/>}{active==='shipping'&&<button className="vn-pill" onClick={()=>onNavigate({section:'delivery'})}>Delivery zones, rates & pickup →</button>}</div></div></section>;
}
