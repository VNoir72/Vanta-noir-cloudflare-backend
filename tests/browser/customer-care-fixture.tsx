import React from 'react';
import {createRoot} from 'react-dom/client';
import '../../app/globals.css';
import '../../app/liquid-glass.css';
import '../../app/admin/control-center.css';
import '../../app/admin/admin-appearance.css';
import {SupportDashboard} from '../../app/admin/support-dashboard';
import {WorkspaceHelp} from '../../app/admin/workspace-help';
import {ContactForm} from '../../components/contact-form';
import {UnsavedChangesProvider} from '../../app/admin/unsaved-changes';
declare global {interface Window {careCalls:any[];failContact:boolean}}
window.careCalls=[];window.failContact=false;
const ticket={id:'11111111-1111-4111-8111-111111111111',subject:'Delivery needs checking',customer_name:'Sample Customer',contact:'sample@example.com',channel:'website',source:'website',public_reference:'VN-HELP-DEMO',order_reference:'VN-DEMO-001',category:'delivery',priority:'urgent',status:'open',assigned_to:'',version:1,unread:1,updated_at:'2026-10-06 10:00:00'};
const order={id:'demo-order',reference:'VN-DEMO-001',firstName:'Sample',lastName:'Customer',email:'sample@example.com',phone:'08012345678',addressLine1:'Sample delivery address',addressLine2:'',city:'Kaduna',state:'Kaduna',country:'NG',totalKobo:9000000,status:'shipped',paymentStatus:'paid',createdAt:'2026-10-05 10:00:00',carrier:'Sample courier',trackingNumber:'TRACK-DEMO',trackingUrl:'https://example.com/tracking',deliveryEstimate:'Awaiting confirmed date',items:[{productName:'Stealth Hoodie Set',size:'L',color:'Dark Burgundy',quantity:1}]};
window.fetch=async(input:any,init:any)=>{const url=new URL(String(input),location.origin);if(init?.method==='POST'){const body=JSON.parse(init.body);window.careCalls.push({path:url.pathname,body});if(url.pathname==='/api/support'){if(window.failContact){window.failContact=false;throw Error('Connection interrupted');}return Response.json({reference:'VN-HELP-DEMO'},{status:201});}if(body.action==='support:seen'){ticket.unread=0;return Response.json({ok:true});}return Response.json({pending:true,requestId:'request-demo'},{status:202});}
 if(url.pathname==='/api/admin/support'){if(url.searchParams.get('resource')==='attention')return Response.json({active:1,unread:ticket.unread,urgent:1});if(url.searchParams.get('resource')==='order-context')return Response.json({returns:[],enquiries:[ticket],approvals:[]});if(url.searchParams.has('id'))return Response.json({ticket,notes:[{author:'Customer (website)',body:'Please check my delivery. I have not received the parcel.',created_at:'2026-10-06 10:00:00'}]});return Response.json({tickets:[ticket],hasMore:false,counts:{total:1,active:1,waiting:0,mine:0},returns:{count:0},pending:{count:0},team:[{email:'support@example.com'},{email:'owner@example.com'}]});}
 if(url.pathname.includes('approvals'))return Response.json({requests:[],pending:0,hasMore:false});return Response.json({orders:[order],total:1,hasMore:false,counts:[]});};
const view=new URLSearchParams(location.search).get('view');
createRoot(document.getElementById('root')!).render(view==='contact'?<main style={{maxWidth:900,margin:'30px auto',padding:20}}><ContactForm/></main>:view==='admin-help'?<WorkspaceHelp role="admin"/>:<main className="vn-control-center"><UnsavedChangesProvider><SupportDashboard email="support@example.com" signOutPath="#"/></UnsavedChangesProvider></main>);
