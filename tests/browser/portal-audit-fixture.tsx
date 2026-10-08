import React from 'react';
import {createRoot} from 'react-dom/client';
import '../../app/globals.css';
import {AdminDashboard} from '../../app/admin/admin-dashboard';
import {SupportDashboard} from '../../app/admin/support-dashboard';
import {OperationsPanel} from '../../app/admin/operations-panel';
import {StaffChat} from '../../app/admin/staff-chat';
import {UnsavedChangesProvider} from '../../app/admin/unsaved-changes';
import type {StaffRole} from '../../lib/operations-permissions';
import '../../app/brand-materials.css';
import '../../app/admin/portal-theme.css';
const role=(new URLSearchParams(location.search).get('role')||'owner') as StaffRole;
const demo=new URLSearchParams(location.search).get('revenue')==='demo';
const analytics={range:{from:'2026-09-09',to:'2026-10-08',previousFrom:'2026-08-10',previousTo:'2026-09-08',days:30,endExclusive:'2026-10-09'},trend:Array.from({length:30},(_,i)=>({label:String(i+1),revenueKobo:demo?Math.round((i*1.5+8+6*Math.sin(i*.7))*100000):0,orders:demo?1:0})),categoryMix:[]};
window.fetch=async(input:any)=>{const u=String(input);let d:any={};if(u.includes('analytics'))d=analytics;if(u.includes('orders'))d={orders:[],total:0,hasMore:false};if(u.includes('products'))d={products:[]};if(u.includes('inventory'))d={inventory:[]};if(u.includes('email-delivery'))d={emails:[],issues:0};if(u.includes('releases'))d={campaigns:[],sales:[]};if(u.includes('integrations'))d={paymentsConfigured:true,emailConfigured:true,ga4Configured:true};if(u.includes('operations'))d={orders:[],rows:[],sales:{orders:0,revenue:0},refunds:{amount:0},bestsellers:[],events:[]};if(u.includes('/sales'))d={sales:[],variants:[],hasMore:false,moreVariants:false,pending:0};if(u.includes('/support'))d={tickets:[],hasMore:false,counts:{total:0,active:0,waiting:0,mine:0},returns:{count:0},pending:{count:0},team:[],active:0,unread:0,urgent:0};if(u.includes('/chat'))d={messages:[],unread:0};return Response.json(d);};
createRoot(document.getElementById('root')!).render(<><UnsavedChangesProvider>{role==='owner'?<AdminDashboard adminName="Audit owner" initialOrders={[]} initialInventory={[]} initialProducts={[]} initialAnalytics={analytics} signOutPath="/"/>:<main className="vn-control-center vn-staff-view" style={{padding:20}}>{role==='support'?<SupportDashboard email="support@example.com"/>:<OperationsPanel role={role}/>}</main>}<StaffChat role={role} email={`${role}@example.com`}/></UnsavedChangesProvider></>);

