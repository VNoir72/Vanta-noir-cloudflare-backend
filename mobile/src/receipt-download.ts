import {customerOrderReference} from '../../lib/order-reference';
import {Platform} from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {money} from './api';
import type {Order} from './types';
const escape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function downloadReceipt(order:Order,mode:'download'|'save'='download'):Promise<'saved'|'downloaded'|'shared'|'cancelled'> {
 const html=`<!doctype html><html><head><meta charset="utf-8"><title>Vanta Noir receipt</title><style>body{font:14px monospace;color:#171717;padding:32px;max-width:640px;margin:auto}h1{letter-spacing:5px}table{width:100%;border-collapse:collapse}td{padding:12px 0;border-bottom:1px solid #ddd}td:last-child{text-align:right}small{color:#555}</style></head><body><h1>VANTA NOIR</h1><p>Presence. Power. Precision.</p><h2>Payment receipt</h2><p>${escape(customerOrderReference(order.reference))}</p><table>${(order.items||[]).map(i=>`<tr><td>${escape(i.productName)}<br><small>${escape(i.color)} / ${escape(i.size)} · Qty ${i.quantity}</small></td><td>${escape(money(i.quantity*i.unitPriceKobo))}</td></tr>`).join('')}<tr><td>Delivery</td><td>${escape(money(order.shippingKobo||0))}</td></tr>${order.paymentFeeKobo?`<tr><td>Payment processing fee</td><td>${escape(money(order.paymentFeeKobo))}</td></tr>`:''}<tr><td>Total ${order.paymentStatus==='paid'?'paid':'due'}</td><td>${escape(money(order.totalKobo+(order.paymentStatus==='paid'?(order.paymentFeeKobo||0):0)))}</td></tr></table><p>${order.paymentStatus==='paid'?'PAID':'PAYMENT UNCONFIRMED'}</p><p>Thank you for your order.<br>vantanoir.store</p></body></html>`;
 if(Platform.OS==='web') {
  if(mode==='save'&&typeof navigator.share==='function'){const file=new File([html],`Vanta-Noir-receipt.html`,{type:'text/html'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'Vanta Noir receipt'});return 'shared';}catch(e){if((e as Error).name==='AbortError')return 'cancelled';throw e;}}}
  const url=URL.createObjectURL(new Blob([html],{type:'text/html'}));
  const link=document.createElement('a');link.href=url;link.download=`Vanta-Noir-receipt-${customerOrderReference(order.reference).replace(/[^a-zA-Z0-9-]/g,'')}.html`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return 'downloaded';
 }
 if(Platform.OS==='android'&&mode==='download'){
  const permission=await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();if(!permission.granted)return 'cancelled';
  const pdf=await Print.printToFileAsync({html,base64:true});if(!pdf.base64)throw new Error('PDF generation failed');
  const target=await FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri,`Vanta-Noir-${customerOrderReference(order.reference).replace(/[^a-zA-Z0-9-]/g,'')}`,'application/pdf');
  await FileSystem.writeAsStringAsync(target,pdf.base64,{encoding:FileSystem.EncodingType.Base64});return 'saved';
 }
 const {uri}=await Print.printToFileAsync({html});
 if(await Sharing.isAvailableAsync())await Sharing.shareAsync(uri,{mimeType:'application/pdf',UTI:'.pdf',dialogTitle:'Save your Vanta Noir receipt'});
 else await Print.printAsync({uri});
 return 'shared';
}
