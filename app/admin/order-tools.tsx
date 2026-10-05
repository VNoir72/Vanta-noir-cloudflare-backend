"use client";
import { useState,useRef } from "react";
import type { AdminOrder } from "@/lib/store-db";
import {useOperationDraft} from './unsaved-changes';
import {TerminalShipping} from './terminal-shipping';
import { toast } from "sonner";

export function exportCsv(name:string,rows:unknown[][]){
  const csv=rows.map(row=>row.map(value=>{const s=String(value??"");return `"${(/^[=+@\-\t\r]/.test(s)?"'":"")+s.replaceAll('"','""')}"`;}).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"})); const link=document.createElement("a");link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function exportOrders(orders:AdminOrder[]){exportCsv("vanta-noir-orders.csv",[["Reference","Date","Name","Email","Phone","Address","City","State","Country","Total NGN","Payment","Status","Courier","Tracking"],...orders.map(o=>[o.reference,o.createdAt,`${o.firstName} ${o.lastName}`,o.email,o.phone,`${o.addressLine1} ${o.addressLine2}`,o.city,o.state,o.country||"Nigeria",o.totalKobo/100,o.paymentStatus,o.status,o.carrier,o.trackingNumber])]);}
export function OrderTools({ order, onSaved }: {order:AdminOrder;onSaved:(tracking:Pick<AdminOrder,"carrier"|"trackingNumber"|"trackingUrl"|"deliveryEstimate">)=>void}){
  const [tracking,setTracking]=useState({carrier:order.carrier||"",trackingNumber:order.trackingNumber||"",trackingUrl:order.trackingUrl||"",deliveryEstimate:order.deliveryEstimate||""});const [busy,setBusy]=useState(false);
  const lock=useRef(false),[saved,setSaved]=useState(false);
  const draft=useOperationDraft('Delivery '+order.reference,tracking,setTracking,busy);
  async function save(){if(lock.current)return;lock.current=true;setBusy(true);setSaved(false);try{const r=await fetch("/api/admin/orders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({reference:order.reference,tracking}),signal:AbortSignal.timeout(20000)});const p=await r.json() as {error?:string};if(!r.ok)throw new Error(p.error||"Could not save tracking.");onSaved(tracking);draft.markSaved();setSaved(true);toast.success("Tracking saved. A customer update is queued.");}catch(e){toast.error(e instanceof Error?e.message:"Please try again.");}finally{lock.current=false;setBusy(false);}}

  function print(){const popup=window.open("","_blank","width=760,height=800");if(!popup){toast.error("Allow pop-ups to print this packing slip.");return;}popup.opener=null;popup.document.title=`Packing slip ${order.reference}`;const pre=popup.document.createElement("pre");pre.style.cssText="font:16px/1.8 system-ui;white-space:pre-wrap;padding:32px;";pre.textContent=`VANTA NOIR\nPACKING SLIP · ${order.reference}\n\n${order.firstName} ${order.lastName}\n${order.addressLine1}\n${order.addressLine2}\n${order.city}, ${order.state}\n${order.country||"Nigeria"}\n${order.phone}\n\n${order.items.map(i=>`${i.quantity} × ${i.productName}\n${i.color} · ${i.size}`).join("\n\n")}\n\nCourier: ${order.carrier}\nTracking: ${order.trackingNumber}`;popup.document.body.appendChild(pre);popup.focus();popup.print();}
  return <div className="mt-4"><TerminalShipping order={order}/><div className="vn-admin-fields">{([['carrier','Courier'],['trackingNumber','Tracking number'],['trackingUrl','HTTPS tracking link'],['deliveryEstimate','Delivery estimate']] as const).map(([key,label])=><label key={key}>{label}<input disabled={busy} type={key==='trackingUrl'?'url':'text'} value={tracking[key]} onChange={e=>setTracking(t=>({...t,[key]:e.target.value}))} maxLength={key==='trackingUrl'?1000:160}/></label>)}</div><button type="button" className="vn-pill" disabled={busy||!draft.dirty||!tracking.carrier.trim()||!tracking.trackingNumber.trim()||order.paymentStatus!=="paid"} onClick={save}>{busy?"Saving…":saved&&!draft.dirty?"Tracking saved ✓":"Save tracking"}</button><p role="status">{draft.dirty?"Unsaved delivery changes":saved?"Delivery details saved ✓":""}</p><button type="button" className="vn-pill" onClick={print}>Print packing slip</button></div>;
}
