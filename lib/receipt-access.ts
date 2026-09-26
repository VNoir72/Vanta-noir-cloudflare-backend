import { getDbBinding } from './runtime-env';
export async function receiptDigest(token:string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(n=>n.toString(16).padStart(2,'0')).join('');
}
export async function canReadReceipt(reference:string,token:string|null) {
  if(!token||!/^[-a-f0-9]{73}$/.test(token))return false;
  const row=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind(`receipt-access:${reference}`).first<{value:string}>();
  if(!row)return false;
  try {const access=JSON.parse(row.value) as {digest:string;expires:number};return access.expires>Date.now()&&access.digest===await receiptDigest(token);}catch{return false;}
}
