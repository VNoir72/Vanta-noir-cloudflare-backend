import {z} from 'zod';
import {firebaseReady,firebaseVerificationEmail,firebaseActionLink} from './firebase-customer';
import {runtimeEnv} from './runtime-env';
import {rateLimit} from './rate-limit';
import {serviceBudget} from './abuse-policy';
import {receiptDigest} from './receipt-access';
const response=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export async function customerEmail(request:Request){
 const v=z.discriminatedUnion('purpose',[
  z.object({purpose:z.literal('verification'),idToken:z.string().min(100).max(10000)}).strict(),
  z.object({purpose:z.literal('reset'),email:z.string().trim().toLowerCase().email().max(200)}).strict()
 ]).parse(await request.json());
 const env=runtimeEnv();
 if(!firebaseReady()||!env.RESEND_API_KEY||!env.EMAIL_FROM)return response({error:'Email is temporarily unavailable. Please try later.'},503);
 if(!await rateLimit(request,'auth-email-ip',5,600))return response({error:'Please wait before requesting another email.'},429);
 let email:string,verified=false;
 if(v.purpose==='verification'){
  try{const identity=await firebaseVerificationEmail(v.idToken);email=identity.email;verified=identity.verified;}catch{return response({error:'Sign in again before requesting verification.'},401);}
 }else email=v.email;
 const recipient=new Request(request.url,{headers:{'cf-connecting-ip':await receiptDigest(email)}});
 if(!await rateLimit(recipient,'auth-email-recipient',1,60)||!await rateLimit(recipient,'auth-email-recipient-hour',5,3600)||!await serviceBudget('email'))return response({error:'Please wait before requesting another email.'},429);
 const success={sent:true,message:v.purpose==='reset'?'If this account exists, check your email for reset instructions.':'Check your email for the verification link.'};
 if(verified)return response({sent:false,verified:true,message:'This email is already verified.'});
 try{
  const link=await firebaseActionLink(email,v.purpose==='verification'?'VERIFY_EMAIL':'PASSWORD_RESET',request.headers.get('cf-connecting-ip')||'0.0.0.0');
  if(!link)return response(success);
  const title=v.purpose==='verification'?'Verify your email':'Reset your password';
  const intro=v.purpose==='verification'?'Confirm this email address to finish setting up your Vanta Noir account.':'Use this secure link to choose a new password for your Vanta Noir account.';
  const text=`${title}\n\n${intro}\n\n${link}\n\nIf you did not request this, ignore this email. Never share this link.\nVanta Noir`;
  const html=`<div style="background:#111;color:#f5f1e8;padding:32px;font-family:Arial,sans-serif;max-width:560px;margin:auto"><p style="letter-spacing:4px">VANTA NOIR</p><h1>${title}</h1><p>${intro}</p><p style="padding:20px 0"><a href="${escape(link)}" style="background:#f5f1e8;color:#111;padding:14px 22px;text-decoration:none">${title}</a></p><p>If the button does not work, copy this link:</p><p style="word-break:break-all">${escape(link)}</p><p>If you did not request this, ignore this email. Never share this link.</p></div>`;
  const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({from:env.EMAIL_FROM,...(env.EMAIL_REPLY_TO?{reply_to:env.EMAIL_REPLY_TO}:{}),to:[email],subject:title+' · Vanta Noir',text,html}),signal:AbortSignal.timeout(12000)});
  if(!sent.ok)throw Error('Delivery unavailable');
  return response(success);
 }catch{return response({error:'We could not send the email. Please try again shortly.'},503);}
}
