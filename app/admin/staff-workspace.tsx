'use client';
import {Menu,X} from 'lucide-react';
import {useCompactNavigation} from './use-compact-navigation';
import {useState} from 'react';
import {BarChart3,Boxes,ClipboardCheck,ExternalLink,FileClock,HelpCircle,LogOut,Package,ShoppingBag,Truck,UserRound} from 'lucide-react';
import {roleResources,type StaffRole} from '@/lib/operations-permissions';
import {AdminBrand} from './admin-brand';
import {OperationsPanel} from './operations-panel';
import {useAdminNavigation} from './unsaved-changes';
import './support-dashboard.css';
const items={sales:{label:'Sales desk',Icon:ShoppingBag},bulk:{label:'Products',Icon:Package},inventory:{label:'Inventory',Icon:Boxes},orders:{label:'Orders',Icon:ShoppingBag},courier:{label:'Shipping',Icon:Truck},reports:{label:'Reports',Icon:BarChart3},requests:{label:'My requests',Icon:ClipboardCheck},help:{label:'Help',Icon:HelpCircle}};
export function StaffWorkspace({role,email,signOutPath}:{role:Exclude<StaffRole,'owner'|'support'>;email:string;signOutPath:string}) {
  const navigation=useCompactNavigation();
  const sections=[...roleResources[role],'requests','help'];
  const [section,setSection]=useState(sections[0]);
  const navigate=useAdminNavigation();
  const title=items[section as keyof typeof items]?.label||'Activity';
  return <main className="vn-control-center vn-staff-view"><div className="vn-support" data-navigation-open={navigation.open}>
    <aside id="vn-staff-navigation" className="vn-support-sidebar" inert={navigation.hidden}><div className="vn-support-brand"><AdminBrand/></div>
      <nav aria-label="Staff navigation">{sections.map(id=>{const item=items[id as keyof typeof items]||{label:'Activity',Icon:FileClock};return <button key={id} aria-current={section===id?'page':undefined} onClick={()=>navigate(()=>{setSection(id);navigation.setOpen(false);})}><item.Icon size={18}/>{item.label}</button>;})}</nav>
      <footer><UserRound size={18}/><div><strong>{role} workspace</strong><small>{email}</small></div><a href={signOutPath} aria-label="Sign out"><LogOut size={18}/></a></footer>
    </aside>
    <div className="vn-support-main"><header className="vn-support-top"><span>Vanta Noir · Staff workspace</span><a className="vn-visit-store" href="https://vantanoir.store" target="_blank" rel="noreferrer">Visit store <ExternalLink size={15}/></a><button className="vn-staff-menu" aria-label={navigation.open?'Close navigation':'Open navigation'} aria-controls="vn-staff-navigation" aria-expanded={navigation.open} onClick={()=>navigation.setOpen(!navigation.open)}>{navigation.open?<X size={20}/>:<Menu size={20}/>}</button></header>
      <div className="vn-support-content"><div className="vn-support-title"><div><h1>{title}</h1><span>Your authorised store tools, organised in one workspace.</span></div></div>
        {section==='help'?<section className="vn-glass"><h2>Your workspace</h2><p>Choose a tool in the sidebar. Review changes before saving and follow their progress in My requests. The owner reviews changes that require approval.</p><p>Use the staff chat for help with a record. Sign out when you finish.</p></section>:<OperationsPanel key={section} role={role} initialSection={section} dedicated/>}
      </div>
    </div>
  </div></main>;
}
