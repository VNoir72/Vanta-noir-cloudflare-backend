import React from 'react';
import {createRoot} from 'react-dom/client';
import '../../app/globals.css';
import {SalesDesk} from '../../app/admin/sales-desk';
import {UnsavedChangesProvider} from '../../app/admin/unsaved-changes';
const state={variants:[{id:'v1',name:'Stealth Hoodie Set',sku:'STEALTH-BURG-L',color:'Dark Burgundy',size:'L',priceKobo:9000000,stock:8,reserved:0,available:8}],sales:[],hasMore:false,moreVariants:false,pending:0};
const calls:any[]=[];(window as any).salesCalls=calls;
window.fetch=async(_input:any,init:any)=>{if(init?.method==='POST'){const body=JSON.parse(init.body);calls.push(body);if((window as any).failOnce){(window as any).failOnce=false;throw new Error('Connection interrupted');}state.pending=1;state.variants[0].reserved=body.items[0].quantity;state.variants[0].available=8-body.items[0].quantity;return Response.json({reference:'VN-WALK-FIXTURE',status:'pending'});}return Response.json(state);};
createRoot(document.getElementById('root')!).render(<main style={{padding:20,background:'#f3f6ef',minHeight:'100vh'}}><UnsavedChangesProvider><SalesDesk/></UnsavedChangesProvider></main>);
