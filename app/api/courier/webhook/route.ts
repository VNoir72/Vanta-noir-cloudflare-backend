import {z} from 'zod';
import {getDbBinding,runtimeEnv} from '@/lib/runtime-env';
import {queueOrderEmail} from '@/lib/commerce-db';
// Provider-neutral receiver: a courier adapter must translate and sign this contract.
export async function POST(request:Request){
 const secret=runtimeEnv().COURIER_WEBHOOK_SECRET;
 if(!secret)return Response.json({error:'Courier receiver is not configured.'},{status:503});
 const raw=await request.text();if(raw.length>16000)return new Response('Payload too large',{status:413});
 const stamp=request.headers.get('x-vanta-timestamp')||'',signature=request.headers.get('x-vanta-signature')||'';
 if(!/^\d{10}$/.test(stamp)||Math.abs(Date.now()/1000-Number(stamp))>300||!(/^[a-f0-9]{64}$/i.test(signature)))return new Response('Invalid signature',{status:401});
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const bytes=Uint8Array.from(signature.match(/../g)!,h=>parseInt(h,16));
 if(!await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(stamp+'.'+raw)))return new Response('Invalid signature',{status:401});
 try{
  const e=z.object({id:z.string().min(1).max(160),reference:z.string().min(3).max(120),status:z.enum(['shipped','delivered']),carrier:z.string().trim().min(1).max(100),trackingNumber:z.string().trim().min(1).max(160)}).parse(JSON.parse(raw));
  const db=getDbBinding();const previous=await db.prepare('SELECT reference,status FROM courier_events WHERE id=?').bind(e.id).first<{reference:string;status:string}>();
  if(previous){if(previous.reference!==e.reference||previous.status!==e.status)return new Response('Event ID conflict',{status:409});await queueOrderEmail(e.reference,`courier:${e.id}`);return Response.json({ok:true,duplicate:true});}
  const token=crypto.randomUUID(),lock=`courier:${e.id}`,gate='EXISTS(SELECT 1 FROM store_meta WHERE key=? AND value=?)';
  const r=await db.batch([
   db.prepare(`INSERT INTO store_meta(key,value) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM courier_events WHERE id=?) AND EXISTS(SELECT 1 FROM orders WHERE reference=? AND payment_status='paid' AND ((?='shipped' AND status IN ('processing','shipped')) OR (?='delivered' AND status IN ('shipped','delivered'))) AND (tracking_number='' OR tracking_number=?)) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).bind(lock,token,e.id,e.reference,e.status,e.status,e.trackingNumber),
   db.prepare(`INSERT INTO courier_events(id,reference,status) SELECT ?,?,? WHERE ${gate}`).bind(e.id,e.reference,e.status,lock,token),
   db.prepare(`UPDATE orders SET status=?,carrier=?,tracking_number=?,updated_at=CURRENT_TIMESTAMP WHERE reference=? AND ${gate}`).bind(e.status,e.carrier,e.trackingNumber,e.reference,lock,token),
   db.prepare(`INSERT INTO admin_audit(actor,action,entity,detail) SELECT 'courier','delivery update',?,? WHERE ${gate}`).bind(e.reference,e.status,lock,token),
   db.prepare('DELETE FROM store_meta WHERE key=? AND value=?').bind(lock,token)]);
  if(!r[0].meta.changes){const duplicate=await db.prepare('SELECT id FROM courier_events WHERE id=? AND reference=? AND status=?').bind(e.id,e.reference,e.status).first();if(!duplicate)return new Response('Order status or tracking does not match',{status:409});}
  await queueOrderEmail(e.reference,`courier:${e.id}`);return Response.json({ok:true});
 }catch(e){return new Response(e instanceof z.ZodError||e instanceof SyntaxError?'Invalid event':'Unable to apply courier event',{status:e instanceof z.ZodError||e instanceof SyntaxError?400:500});}
}
