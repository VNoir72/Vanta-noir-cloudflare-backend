import {z} from 'zod';
import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {getDbBinding} from '@/lib/runtime-env';
export const dynamic='force-dynamic';
const channelSchema=z.enum(['all','sales','support','fulfilment','catalogue','analyst']);
export async function GET(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 try{const p=new URL(request.url).searchParams,c=channelSchema.parse(p.get('channel')||'all'),after=z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER).parse(p.get('after')||0),db=getDbBinding();
 const unread=await db.prepare("SELECT COUNT(*) AS count FROM staff_chat_messages m LEFT JOIN staff_chat_reads r ON r.email=? AND r.channel=m.channel WHERE m.seq>COALESCE(r.last_seq,0) AND m.author<>?").bind(auth.email,auth.email).first<{count:number}>();
 const rows=p.get('summary')==='1'?[]:(await db.prepare('SELECT seq,id,channel,author,role,body,created_at FROM staff_chat_messages WHERE channel=? AND seq>? ORDER BY seq DESC LIMIT 100').bind(c,after).all()).results.reverse();
 return Response.json({messages:rows,unread:unread?.count||0,email:auth.email},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Chat could not load. Please retry.'},{status:503});}
}
export async function POST(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 const text=await request.text();if(text.length>6000)return Response.json({error:'Message is too long.'},{status:413});
 try{const v=z.discriminatedUnion('action',[
 z.object({action:z.literal('send'),id:z.string().uuid(),channel:channelSchema,body:z.string().trim().min(1).max(2000)}).strict(),
 z.object({action:z.literal('read'),channel:channelSchema,seq:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)}).strict()]).parse(JSON.parse(text));const db=getDbBinding();
 if(v.action==='read'){await db.prepare('INSERT INTO staff_chat_reads(email,channel,last_seq) VALUES(?,?,MIN(?,COALESCE((SELECT MAX(seq) FROM staff_chat_messages WHERE channel=?),0))) ON CONFLICT(email,channel) DO UPDATE SET last_seq=MAX(last_seq,excluded.last_seq)').bind(auth.email,v.channel,v.seq,v.channel).run();return Response.json({ok:true});}
 const existing=await db.prepare('SELECT author FROM staff_chat_messages WHERE id=?').bind(v.id).first<{author:string}>();if(existing)return Response.json(existing.author===auth.email?{ok:true}:{error:'Message identifier already exists.'},{status:existing.author===auth.email?200:409});
 const result=await db.prepare("INSERT INTO staff_chat_messages(id,channel,author,role,body) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM staff_chat_messages WHERE author=? AND created_at>datetime('now','-1 minute'))<30").bind(v.id,v.channel,auth.email,auth.role,v.body,auth.email).run();if(!result.meta.changes)return Response.json({error:'Please wait a moment before sending more messages.'},{status:429});return Response.json({ok:true},{status:201});
 }catch(e){return Response.json({error:e instanceof z.ZodError?'Enter a message of 1–2,000 characters.':'Message could not be sent. Retry safely.'},{status:400});}
}
