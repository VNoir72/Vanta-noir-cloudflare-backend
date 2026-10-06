import {z} from 'zod';
import {getDbBinding,runtimeEnv} from './runtime-env';
import {rateLimit} from './commerce-db';
export const enquirySchema=z.object({requestId:z.string().uuid(),name:z.string().trim().min(2).max(120),email:z.string().trim().toLowerCase().email().max(200),phone:z.string().trim().max(40).default(''),orderReference:z.string().trim().max(120).default(''),category:z.enum(['order','delivery','payment','return','sizing','product','privacy','other']),subject:z.string().trim().min(3).max(160),message:z.string().trim().min(10).max(4000),serious:z.boolean().default(false),website:z.string().max(200).default('')}).strict();
export async function receiveEnquiry(request:Request){
 const raw=await request.text();if(raw.length>15000)return Response.json({error:'Please shorten your message.'},{status:413});
 const parsed=enquirySchema.safeParse(JSON.parse(raw));if(!parsed.success||parsed.data.website)return Response.json({error:'Check the form and try again.'},{status:400});
 const v=parsed.data,db=getDbBinding();
 if(!await rateLimit(request,'customer-support',6,3600))return Response.json({error:'Please wait before sending another enquiry.'},{status:429});
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v.email)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const old=await db.prepare("SELECT public_reference,contact FROM support_tickets WHERE id=? AND source='website'").bind(v.requestId).first<{public_reference:string;contact:string}>();
 if(old){if(old.contact!==v.email)return Response.json({error:'Please reload the form before submitting.'},{status:409});return Response.json({reference:old.public_reference},{headers:{'Cache-Control':'no-store'}});}
 if(!await rateLimit(new Request(request.url,{headers:{'cf-connecting-ip':digest}}),'support-email',3,3600))return Response.json({error:'Please wait before sending another enquiry.'},{status:429});
 const reference='VN-HELP-'+crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase();
 const owner=runtimeEnv().ADMIN_EMAIL?.trim().toLowerCase();
 const team=await db.prepare("SELECT email FROM admin_staff WHERE active=1 AND role='support'").all<{email:string}>();
 const recipients=[...new Set([...team.results.map(t=>t.email),...(owner?[owner]:[])])];
 const email=(event:string,to:string,subject:string,body:string)=>db.prepare('INSERT OR IGNORE INTO email_outbox(id,event_key,recipient,subject,body) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),event,to,subject,body);
 const statements=[db.prepare("INSERT INTO support_tickets(id,subject,customer_name,contact,channel,order_reference,category,priority,assigned_to,created_by,public_reference,source) VALUES(?,?,?,?,'website',?,?,?,'','customer',?,'website')").bind(v.requestId,v.subject,v.name,v.email,v.orderReference,v.category,v.serious?'urgent':'normal',reference),db.prepare('INSERT INTO support_notes(id,ticket_id,author,body) VALUES(?,?,?,?)').bind(crypto.randomUUID(),v.requestId,'Customer (website)',v.message+(v.phone?'\nContact phone: '+v.phone:'')),email('support-receipt:'+v.requestId,v.email,'Enquiry received · '+reference,`We received a customer-care enquiry using this email address.\nReference: ${reference}\nOur support team will review it and contact you by email. This acknowledgement does not confirm a payment, refund or delivery date.\nIf you did not send an enquiry, ignore this message.\nVanta Noir`),...recipients.map(to=>email(`support-alert:${v.requestId}:${to}`,to,`${v.serious?'Urgent concern':'New enquiry'} · ${reference}`,`A customer enquiry needs review in the Support workspace.\nReference: ${reference}\n${v.serious?'The customer marked this as a serious concern. Review and escalate to the owner as needed.':'Open the enquiry, check the facts and assign a follow-up.'}\nSign in: https://api.vantanoir.store/admin\nCustomer details are available only after signing in.`))];
 try{await db.batch(statements);}catch(e){const retry=await db.prepare("SELECT public_reference,contact FROM support_tickets WHERE id=? AND source='website'").bind(v.requestId).first<{public_reference:string;contact:string}>();if(retry?.contact===v.email)return Response.json({reference:retry.public_reference});throw e;}
 return Response.json({reference},{status:201,headers:{'Cache-Control':'no-store'}});
}
