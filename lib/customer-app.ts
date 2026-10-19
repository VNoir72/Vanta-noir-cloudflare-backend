import {customerEmail} from './customer-email';
import {customerAccessAllowed,customerAccessKey} from './customer-access';
import {customerSessionToken,customerCookieResponse,webSessionRequest} from './customer-cookie';
import {completeIdentityDeletion} from './customer-deletion';
import {profileDetailsSchema} from './customer-profile';
import {currencyRates} from './currency-rates';
import {serviceBudget} from './abuse-policy';
import {recordPresence,growthConfig} from './growth';
import {circleMembership,circleStart,circleVerify,circleManage,circleBeforeDeletion} from './circle';
import {phoneStatus,phoneSend,phoneVerify} from './phone-verification';
import {memberHub,setMemberWatch} from './app-members';
import {appAccessContext} from './app-attestation';
import {restartPayment} from './restart-payment';
import {firebaseReady,verifyFirebaseCustomer} from './firebase-customer';
import {appSession} from './app-session';
export {appSession} from './app-session';
import {registerPush} from "./customer-push";
import {expireUnpaidOrders} from './order-expiry';
import {customerCenter} from './customer-center';
import {reviewSchema,submitReview} from './commerce-db';
import {listCustomerCards,saveCustomerCard,removeCustomerCard,canSaveCard} from './customer-cards';
import {customerDeletionPage} from './customer-deletion-page';
import { z } from "zod";
import { getDbBinding, runtimeEnv } from "./runtime-env";
import { receiptDigest } from "./receipt-access";
import { rateLimit } from "./rate-limit";
import { checkoutCustomerSchema } from "./checkout-address";
import { getPublicPaymentOrder } from "./store-db";
const emailSchema = z.string().trim().toLowerCase().email().max(200);
const tokenPattern = /^[a-f0-9-]{73}$/;
const json = (v: unknown, status = 200) =>
  Response.json(v, { status, headers: { "Cache-Control": "no-store" } });
export async function linkAppOrder(
  request: Request,
  reference: string,
  email: string,
) {
  const s = await appSession(request);
  if (!s) return;
  if (s.email !== email.trim().toLowerCase())
    throw new Error("Use your signed-in email for checkout.");
  await getDbBinding()
    .prepare(
      "INSERT OR IGNORE INTO app_customer_orders(customer_id,reference) VALUES(?,?)",
    )
    .bind(s.id, reference)
    .run();
}
export async function customerApp(request: Request): Promise<Response> {
  if(new URL(request.url).pathname==='/api/customer/delete-account'&&request.method==='GET')return new Response(customerDeletionPage,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  if (runtimeEnv().CUSTOMER_APP_ENABLED !== "true")
    return json({ error: "Customer accounts are not open yet." }, 503);
  const db = getDbBinding(),
    path = new URL(request.url).pathname.replace("/api/customer/", "");
  try {
    if (!(await rateLimit(request, "customer-app", 80, 600)))
      return json({ error: "Please wait and try again." }, 429);
    if(path==='benefits'||path==='benefit-watch'){
      const access=await appAccessContext(request);if(!access.customerId)return json({error:'Sign in to view your app benefits.'},401);
      if(path==='benefits'&&request.method==='GET')return json(await memberHub(access));
      if(path==='benefit-watch'&&request.method==='POST')return json(await setMemberWatch(access,await request.json()));
      return json({error:'Method not allowed.'},405);
    }
    if(request.method==='POST'&&path==='email')return customerEmail(request);
    if(request.method==='GET'&&path==='currencies')return currencyRates();
    if(request.method==='GET'&&path==='auth-methods')return json({password:firebaseReady(),google:firebaseReady(),apple:firebaseReady()&&runtimeEnv().FIREBASE_APPLE_ENABLED==='true'});
    if(request.method==='POST'&&path==='firebase'){
      if(!firebaseReady())return json({error:'Additional sign-in methods are not available yet.'},503);
      const v=z.object({idToken:z.string().min(100).max(10000),acceptTerms:z.literal(true)}).strict().parse(await request.json());
      if(!await rateLimit(request,'customer-firebase',10,600))return json({error:'Please wait before signing in again.'},429);
      let identity;try{identity=await verifyFirebaseCustomer(v.idToken);}catch{return json({error:'Sign in again with a verified email address.'},401);}
      if(identity.provider==='apple.com'&&runtimeEnv().FIREBASE_APPLE_ENABLED!=='true')return json({error:'Apple sign-in is not available yet.'},503);
      if(await db.prepare('SELECT key FROM store_meta WHERE key=?').bind('identity-deletion:'+identity.uid).first())return json({error:'Account deletion is still completing. Please try again later.'},409);
      const email=emailSchema.parse(identity.email),now=Date.now();
      if(!await customerAccessAllowed(email,identity.authenticatedAt))return json({error:'Account access is restricted or a fresh sign-in is required. Contact customer care for help.'},401);
      await db.prepare('INSERT OR IGNORE INTO app_customers(id,email,created_at,terms_accepted_at) VALUES(?,?,?,?)').bind(crypto.randomUUID(),email,now,now).run();
      const customer=await db.prepare('SELECT id,email,name FROM app_customers WHERE email=?').bind(email).first<{id:string;email:string;name:string}>();
      if(!customer)throw Error('Account unavailable');
      const binding=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind('firebase-customer:'+customer.id).first<{value:string}>();
      if(binding&&binding.value!==identity.uid)return json({error:'Use your existing sign-in method or contact support to link accounts.'},409);
      const token=crypto.randomUUID()+'-'+crypto.randomUUID();
      const sessionDigest=await receiptDigest(token);
      await db.batch([
        db.prepare('DELETE FROM app_sessions WHERE expires_at<?').bind(now),
        db.prepare("DELETE FROM store_meta WHERE key LIKE 'firebase-session:%' AND NOT EXISTS(SELECT 1 FROM app_sessions WHERE digest=substr(store_meta.key,18))"),
        db.prepare("DELETE FROM store_meta WHERE key LIKE 'deletion-grant:%' AND json_extract(value,'$.expiresAt')<?").bind(now),
      ]);
      await db.batch([db.prepare('INSERT OR IGNORE INTO store_meta(key,value) VALUES(?,?)').bind('firebase-customer:'+customer.id,identity.uid),db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?)').bind('firebase-session:'+sessionDigest,identity.uid),db.prepare("INSERT INTO app_sessions(digest,customer_id,created_at,expires_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM store_meta WHERE key=? AND value=?) AND NOT EXISTS (SELECT 1 FROM store_meta WHERE key=? AND (json_extract(value,'$.status')='suspended' OR json_extract(value,'$.validAfter')>=?))").bind(await receiptDigest(token),customer.id,identity.authenticatedAt,now+30*86400000,'firebase-customer:'+customer.id,identity.uid,customerAccessKey(email),identity.authenticatedAt)]);
      const linked=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind('firebase-customer:'+customer.id).first<{value:string}>();
      if(linked?.value!==identity.uid)return json({error:'Use your existing sign-in method.'},409);
      if(!await db.prepare('SELECT digest FROM app_sessions WHERE digest=?').bind(sessionDigest).first())return json({error:'Account access changed. Sign in again or contact customer care.'},401);
      return customerCookieResponse(request,{...(webSessionRequest(request)?{}:{token}),customer,expiresAt:now+30*86400000},token,now+30*86400000);
    }
    if (request.method === "POST" && path === "code") {
      const { email, purpose } = z
        .object({ email: emailSchema, purpose:z.enum(['signin','deletion']).default('signin') })
        .parse(await request.json());
      if(purpose!=='deletion')return json({error:'Sign in with your password or Google.'},410);
      const env = runtimeEnv();
      if (!env.RESEND_API_KEY || !env.EMAIL_FROM)
        return json({ error: "Sign-in email is unavailable." }, 503);
      const limitRequest = new Request(request.url, {
        headers: { "cf-connecting-ip": email },
      });
      if (
        !(await rateLimit(request, "customer-code", 5, 600)) ||
        !(await rateLimit(limitRequest, "customer-code-email", 3, 600)) ||
        !(await rateLimit(new Request(request.url), "customer-code-global-hour", 50, 3600)) ||
        !(await rateLimit(new Request(request.url), "customer-code-global-day", 200, 86400))
      )
        return json(
          { error: "Please wait before requesting another code." },
          429,
        );
      const challenge = crypto.randomUUID() + "-" + crypto.randomUUID();
      const numbers = crypto.getRandomValues(new Uint32Array(1));
      const code = String(numbers[0] % 100000000).padStart(8, "0");
      await db.batch([
        db
          .prepare(
            "DELETE FROM app_login_challenges WHERE expires_at<? OR email=?",
          )
          .bind(Date.now(), email),
        db
          .prepare(
            "INSERT INTO app_login_challenges(id,email,digest,expires_at,purpose) VALUES(?,?,?,?,?)",
          )
          .bind(
            challenge,
            email,
            await receiptDigest(challenge + ":" + code),
            Date.now() + 600000,
            purpose,
          ),
      ]);
      if(!await serviceBudget('email'))return json({error:'Email sending is temporarily paused. Please try later.'},429);
      const sent = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(12000),
        headers: {
          Authorization: "Bearer " + env.RESEND_API_KEY,
          "Content-Type": "application/json",
          "Idempotency-Key": challenge,
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [email],
          subject: "Verify your Vanta Noir account deletion",
          text:
            "Your Vanta Noir code is " +
            code +
            ". It expires in 10 minutes. Do not share this code. If you did not request it, ignore this email.",
        }),
      });
      if (!sent.ok) {
        await db
          .prepare("DELETE FROM app_login_challenges WHERE id=?")
          .bind(challenge)
          .run();
        return json(
          { error: "We could not send your code. Please try later." },
          502,
        );
      }
      return json({ challenge, expiresIn: 600 });
    }
    if (request.method === "POST" && path === "verify") {
      const v = z
        .object({
          challenge: z.string().regex(tokenPattern),
          code: z.string().regex(/^\d{8}$/),
          acceptTerms: z.boolean().optional(),
        })
        .parse(await request.json());
      const challenge = await db
        .prepare(
          "UPDATE app_login_challenges SET attempts=attempts+1 WHERE id=? AND expires_at>? AND attempts<5 RETURNING email,digest,purpose",
        )
        .bind(v.challenge, Date.now())
        .first<{ email: string; digest: string; purpose: string }>();
      if (
        !challenge ||
        challenge.digest !== (await receiptDigest(v.challenge + ":" + v.code))
      )
        return json({ error: "That code is invalid or expired." }, 400);
      if(challenge.purpose!=='deletion')return json({error:'Sign in with your password or Google.'},410);
      const claimed=await db.prepare('DELETE FROM app_login_challenges WHERE id=? RETURNING email').bind(v.challenge).first<{email:string}>();
      if(!claimed)return json({error:'That code has already been used.'},400);
      const customer=await db.prepare('SELECT id FROM app_customers WHERE email=?').bind(claimed.email).first<{id:string}>();
      if(!customer)return json({error:'No account exists for this email.'},404);
      const token=crypto.randomUUID()+'-'+crypto.randomUUID(),expiresAt=Date.now()+600000;
      await db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?)').bind('deletion-grant:'+await receiptDigest(token),JSON.stringify({customerId:customer.id,expiresAt})).run();
      return json({token,expiresAt});
    }
    if(path==='logout'&&request.method==='POST'){
      const token=customerSessionToken(request);
      if(tokenPattern.test(token)){const digest=await receiptDigest(token);await db.batch([db.prepare('DELETE FROM app_sessions WHERE digest=?').bind(digest),db.prepare('DELETE FROM store_meta WHERE key=?').bind('firebase-session:'+digest)]);}
      return customerCookieResponse(request,{signedOut:true},'',0);
    }
    // A deletion grant authorizes only DELETE /me and survives retryable prerequisite failures.
    let s=await appSession(request);
    if(!s && path==='me' && request.method==='DELETE'){
      const body=z.object({confirmation:z.literal('DELETE')}).parse(await request.clone().json());
      if(body.confirmation!=='DELETE')return json({error:'Confirm account deletion.'},400);
      const token=request.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
      if(tokenPattern.test(token)){
        const grant=await db.prepare("SELECT value FROM store_meta WHERE key=? AND json_extract(value,'$.expiresAt')>?").bind('deletion-grant:'+await receiptDigest(token),Date.now()).first<{value:string}>();
        if(grant)s=await db.prepare('SELECT id,email,name,addresses_json,favourites_json,? AS authenticatedAt FROM app_customers WHERE id=?').bind(Date.now(),JSON.parse(grant.value).customerId).first<NonNullable<typeof s>>();
      }
    }
    if (!s) return json({ error: "Please sign in again." }, 401);
    if(!await rateLimit(new Request(request.url,{headers:{'cf-connecting-ip':s.id}}),'customer-account:'+(['GET','HEAD'].includes(request.method)?'read':'write'),['GET','HEAD'].includes(request.method)?180:40,60))return json({error:'Please wait a minute before trying again.'},429);
    if(path==='web-session'&&request.method==='POST'){
      if(!webSessionRequest(request))return json({error:'Open the website to continue.'},403);
      const token=customerSessionToken(request),row=await db.prepare('SELECT expires_at FROM app_sessions WHERE digest=?').bind(await receiptDigest(token)).first<{expires_at:number}>();
      if(!row)return json({error:'Please sign in again.'},401);
      return customerCookieResponse(request,{expiresAt:row.expires_at},token,row.expires_at);
    }
    if(path==='sessions'&&request.method==='GET'){
      const current=await receiptDigest(customerSessionToken(request));
      const rows=await db.prepare('SELECT digest,created_at,expires_at FROM app_sessions WHERE customer_id=? AND expires_at>? ORDER BY created_at DESC LIMIT 100').bind(s.id,Date.now()).all<{digest:string;created_at:number;expires_at:number}>();
      return json({sessions:rows.results.map(row=>({id:row.digest,createdAt:row.created_at,expiresAt:row.expires_at,current:row.digest===current}))});
    }
    if(path==='sessions'&&request.method==='DELETE'){
      const {id}=z.object({id:z.string().regex(/^[a-f0-9]{64}$/)}).strict().parse(await request.json());
      const current=await receiptDigest(customerSessionToken(request));
      if(id===current)return json({error:'Use Sign out to end your current session.'},400);
      await db.prepare('DELETE FROM app_sessions WHERE customer_id=? AND digest=?').bind(s.id,id).run();
      return json({revoked:true});
    }
    if(path==='presence'&&request.method==='POST')return json(await recordPresence(request,s.id,await request.json()));
    if(path==='phone'&&request.method==='GET')return json(await phoneStatus(s.id));
    if(path==='phone/send'&&request.method==='POST')return json(await phoneSend(request,s.id));
    if(path==='phone/verify'&&request.method==='POST')return json(await phoneVerify(s.id,await request.json()));
    // Account-owned membership status is shared; enrolment and benefits retain app verification.
    if(path==='circle/status'&&request.method==='GET'){
      const membership=await circleMembership(s.id);
      return json({membership:{active:membership.active,until:membership.until,cancelled:membership.cancelled}});
    }
    if(path==='circle'||path.startsWith('circle/')){
      const access=await appAccessContext(request);if(!access.verifiedApp)return json({error:'Circle is available only in the verified Vanta Noir app.'},403);
      if(path==='circle'&&request.method==='GET'){const config=await growthConfig();return json({config:config.circle,version:config.version,membership:await circleMembership(s.id)});}
      if(path==='circle/start'&&request.method==='POST')return json(await circleStart(s.id,s.email,await request.json()));
      if(path==='circle/verify'&&request.method==='POST'){const v=z.object({reference:z.string().max(150)}).strict().parse(await request.json());try{return json(await circleVerify(v.reference,s.id));}catch{return json({error:"Your membership payment is not confirmed yet. If you have paid, do not pay again. Refresh your membership shortly or contact support with your payment reference."},409);}}
      if(path==='circle/history'&&request.method==='GET'){const rows=await db.prepare("SELECT value FROM store_meta WHERE key LIKE 'circle-receipt:%' AND json_extract(value,'$.customerId')=? ORDER BY CAST(json_extract(value,'$.paidAt') AS INTEGER) DESC LIMIT 100").bind(s.id).all<{value:string}>();return json({receipts:rows.results.map(row=>{const r=JSON.parse(row.value);return {reference:r.reference,amountKobo:r.amount,paidAt:r.paidAt,until:r.until,refunded:r.refunded===true};})});}
      if(path==='circle/manage'&&request.method==='POST')return json(await circleManage(s.id));
      return json({error:'Method not allowed.'},405);
    }
    if(path==='push'&&['POST','DELETE'].includes(request.method)){
      const {token}=z.object({token:z.string().regex(/^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]+\]$/).max(200)}).strict().parse(await request.json());
      await registerPush(s.id,token,request.method==='DELETE');return json({registered:request.method==='POST'});
    }
    if (path === "me" && request.method === "GET") {
      const profile=await db.prepare("SELECT value FROM store_meta WHERE key=?").bind("customer-profile:"+s.id).first<{value:string}>();
      const details=profile?JSON.parse(profile.value):{};
      const phone=details.phone||"";
      return json({
        customer: {
          email: s.email,
          name: s.name,
          phone,
          profile: ["photo","gender","birthday"].some(key=>Object.hasOwn(details,key)) ? {photo:details.photo||"",gender:details.gender||"",birthday:details.birthday||""} : undefined,
          addresses: JSON.parse(s.addresses_json),
          favourites: JSON.parse(s.favourites_json),
        },
      });
    }
    if(path==='center'&&request.method==='GET')return json(await customerCenter(s.id,s.email));
    if(path==='reviews'&&request.method==='POST'){
      if(!await rateLimit(request,'customer-review',10,3600))return json({error:'Please wait before submitting another review.'},429);
      const v=reviewSchema.omit({email:true}).strict().parse(await request.json());
      const owned=await db.prepare('SELECT reference FROM app_customer_orders WHERE reference=? AND customer_id=?').bind(v.reference,s.id).first();
      if(!owned)return json({error:'Order not found.'},404);
      await submitReview({...v,email:s.email});
      return json({submitted:true,message:'Your review is awaiting moderation.'},201);
    }
    if (path === 'cards' && request.method === 'GET') return json(await listCustomerCards(s.id));
    if (path === 'cards' && request.method === 'POST') {
      const v=z.object({reference:z.string().min(1).max(120),consent:z.literal(true)}).strict().parse(await request.json());
      return json(await saveCustomerCard(s.id,s.email,v.reference));
    }
    if (path === 'cards' && request.method === 'DELETE') {
      const v=z.object({id:z.string().min(1).max(120)}).strict().parse(await request.json());
      await removeCustomerCard(s.id,v.id);
      return json({removed:true});
    }
    if (path === "me" && request.method === "PATCH") {
      const v = z.object({
        profile:profileDetailsSchema.optional(),
        name:z.string().trim().max(100).optional(),
        phone:z.string().trim().max(30).refine(v=>!v||/^\+?[0-9 ()-]{7,30}$/.test(v),'Enter a valid phone number.').optional(),
        addresses:z.array(checkoutCustomerSchema).max(5).optional(),
        expectedAddresses:z.array(checkoutCustomerSchema).max(5).optional(),
        favourites:z.array(z.string().max(160)).max(200).optional(),
      }).parse(await request.json());
      const columns:string[]=[],values:unknown[]=[];
      if(v.name!==undefined){columns.push('name=?');values.push(v.name);}
      if(v.favourites!==undefined){columns.push('favourites_json=?');values.push(JSON.stringify([...new Set(v.favourites)]));}
      // Compare schema-normalized snapshots, not JSON key order or omitted defaults.
      // Keep the original database bytes below for the atomic concurrent-write guard.
      const storedAddresses=z.array(checkoutCustomerSchema).safeParse(JSON.parse(s.addresses_json));
      const addressSnapshot=storedAddresses.success?JSON.stringify(storedAddresses.data):s.addresses_json;
      const changedAddresses=v.addresses!==undefined&&JSON.stringify(v.addresses)!==addressSnapshot;
      if(changedAddresses){
        // Old full-profile clients may not silently overwrite an existing address book.
        if(v.expectedAddresses===undefined&&JSON.parse(s.addresses_json).length)return json({error:'Your saved addresses changed. Reload your account before editing them.'},409);
        if(v.expectedAddresses!==undefined&&JSON.stringify(v.expectedAddresses)!==addressSnapshot)return json({error:'Your saved addresses changed on another device. Reload before saving.'},409);
        columns.push('addresses_json=?');values.push(JSON.stringify(v.addresses));
      }
      if(columns.length){
        const saved=await db.prepare('UPDATE app_customers SET '+columns.join(',')+' WHERE id=?'+(changedAddresses?' AND addresses_json=?':''))
          .bind(...values,s.id,...(changedAddresses?[s.addresses_json]:[])).run();
        if(saved.meta.changes===0)return json({error:'Your account changed. Reload before saving.'},409);
      }
      if(v.phone!==undefined||v.profile!==undefined)await db.prepare("INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=json_patch(store_meta.value,excluded.value)").bind('customer-profile:'+s.id,JSON.stringify({...v.profile,...(v.phone!==undefined?{phone:v.phone}:{})})).run();
      return json({ saved: true });
    }
    if (path === "me" && request.method === "DELETE") {
      if (Date.now() - s.authenticatedAt > 600000)
        return json(
          {
            error: "Sign in again, then delete your account.",
          },
          403,
        );
      const v = z
        .object({ confirmation: z.literal("DELETE") })
        .parse(await request.json());
      void v;
      const firebase=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind('firebase-customer:'+s.id).first<{value:string}>();
      // Resolve billing before removing either identity. A failed prerequisite leaves login intact.
      await circleBeforeDeletion(s.id);
      // Explicit cleanup also covers deployments with foreign-key enforcement disabled.
      const cardsTable=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_customer_cards'").first();
      const crmTable=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='crm_profiles'").first();
      await db.batch([
        // Queue provider cleanup in the same transaction as local deletion.
        ...(firebase?[db.prepare('INSERT OR IGNORE INTO store_meta(key,value) VALUES(?,?)').bind('identity-deletion:'+firebase.value,JSON.stringify({uid:firebase.value,createdAt:Date.now()}))]:[]),
        db.prepare("DELETE FROM store_meta WHERE key LIKE 'deletion-grant:%' AND json_extract(value,'$.customerId')=?").bind(s.id),
        db.prepare("DELETE FROM store_meta WHERE key IN (SELECT 'firebase-session:'||digest FROM app_sessions WHERE customer_id=?)").bind(s.id),
        db.prepare("DELETE FROM store_meta WHERE key IN (?,?)").bind('circle-enrol:'+s.id,'circle-member:'+s.id),
        db.prepare("DELETE FROM store_meta WHERE (key LIKE 'presence:%' OR key LIKE 'activity:%') AND json_extract(value,'$.customerId')=?").bind(s.id),
        db.prepare('DELETE FROM store_meta WHERE key IN (?,?)').bind('phone-verified:'+s.id,'phone-challenge:'+s.id),
        ...(crmTable?[db.prepare('DELETE FROM crm_notes WHERE email=?').bind(s.email),db.prepare('DELETE FROM crm_profiles WHERE email=?').bind(s.email),db.prepare("UPDATE subscribers SET status='unsubscribed',updated_at=CURRENT_TIMESTAMP WHERE lower(email)=?").bind(s.email)]:[]),
        ...(cardsTable ? [db.prepare('DELETE FROM app_customer_cards WHERE customer_id=?').bind(s.id)] : []),
        db.prepare("DELETE FROM app_sessions WHERE customer_id=?").bind(s.id),
        db
          .prepare("DELETE FROM app_customer_orders WHERE customer_id=?")
          .bind(s.id),
        db
          .prepare("DELETE FROM app_login_challenges WHERE email=?")
          .bind(s.email),
        db.prepare("DELETE FROM store_meta WHERE key LIKE 'push-device:%' AND json_extract(value,'$.customerId')=?").bind(s.id),
      db.prepare("DELETE FROM store_meta WHERE key LIKE ?").bind('app-watch:'+s.id+':%'),
        db.prepare("DELETE FROM store_meta WHERE key=?").bind("firebase-customer:"+s.id),
        db.prepare("DELETE FROM store_meta WHERE key=?").bind("customer-profile:"+s.id),
        db.prepare("DELETE FROM app_customers WHERE id=?").bind(s.id),
      ]);
      const identityDeletionPending=firebase ? !await completeIdentityDeletion(firebase.value) : false;
      return json({
        deleted: true,
        identityDeletionPending,
        message:
          "Account, addresses and favourites deleted. Required transaction records are retained under our published retention policy.",
      });
    }
    if(path==='restart-payment'&&request.method==='POST'){const {reference}=z.object({reference:z.string().min(1).max(120)}).strict().parse(await request.json());return json(await restartPayment(s.id,reference));}
    if(path==='orders'&&request.method==='PATCH'){
      const {reference}=z.object({reference:z.string().min(1).max(120)}).strict().parse(await request.json());
      const owned=await db.prepare('SELECT reference FROM app_customer_orders WHERE reference=? AND customer_id=?').bind(reference,s.id).first();
      if(!owned)return json({error:'Order not found.'},404);
      if(await db.prepare('SELECT key FROM store_meta WHERE key=?').bind('purged-order:'+s.id+':'+reference).first())return json({error:'This order was permanently removed from your history.'},409);
      await db.prepare('DELETE FROM store_meta WHERE key=?').bind('hidden-order:'+s.id+':'+reference).run();
      return json({restored:true});
    }
    if(path==='orders'&&request.method==='DELETE'){
      const {reference,permanent}=z.object({reference:z.string().min(1).max(120),permanent:z.boolean().optional()}).strict().parse(await request.json());
      const owned=await db.prepare('SELECT reference FROM app_customer_orders WHERE reference=? AND customer_id=?').bind(reference,s.id).first();
      if(!owned)return json({error:'Order not found.'},404);
      if(permanent){
        if(!await db.prepare('SELECT key FROM store_meta WHERE key=?').bind('hidden-order:'+s.id+':'+reference).first())return json({error:'Move the order to the recycle bin first.'},409);
        await db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('purged-order:'+s.id+':'+reference,JSON.stringify({removedAt:new Date().toISOString()})).run();return json({removed:true,permanent:true});
      }
      await db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('hidden-order:'+s.id+':'+reference,JSON.stringify({hiddenAt:new Date().toISOString()})).run();
      return json({removed:true});
    }
    if (path === "orders" && request.method === "GET") {
      await expireUnpaidOrders();
      const rows = await db
        .prepare(
          `SELECT o.reference,o.status,o.payment_status AS paymentStatus,o.total_kobo AS totalKobo,o.created_at AS createdAt,o.carrier,o.tracking_number AS trackingNumber,o.tracking_url AS trackingUrl,o.delivery_estimate AS deliveryEstimate
    FROM app_customer_orders a JOIN orders o ON o.reference=a.reference WHERE a.customer_id=? AND NOT EXISTS(SELECT 1 FROM store_meta WHERE key='purged-order:'||a.customer_id||':'||o.reference) AND ${new URL(request.url).searchParams.get('deleted')==='true'?'':'NOT '}EXISTS(SELECT 1 FROM store_meta WHERE key='hidden-order:'||a.customer_id||':'||o.reference) ORDER BY o.created_at DESC LIMIT 100`,
        )
        .bind(s.id)
        .all();
      const orders=await Promise.all(rows.results.map(async o=>({...o,items:(await db.prepare('SELECT variant_id AS variantId,product_name AS productName,color,size,quantity,unit_price_kobo AS unitPriceKobo FROM order_items WHERE order_id=(SELECT id FROM orders WHERE reference=?)').bind(o.reference).all()).results})));
      return json({ orders });
    }
    if (path === "receipt" && request.method === "GET") {
      const reference =
        new URL(request.url).searchParams.get("reference") || "";
      const row = await db
        .prepare(
          "SELECT reference FROM app_customer_orders WHERE reference=? AND customer_id=?",
        )
        .bind(reference, s.id)
        .first();
      return row
        ? json({ order: {...await getPublicPaymentOrder(reference),canSaveCard:await canSaveCard(s.id,s.email,reference)} })
        : json({ error: "Order not found." }, 404);
    }
    return json({ error: "Not found." }, 404);
  } catch (error) {
    return json(
      {
        error:
          error instanceof z.ZodError
            ? "Please check the information you entered."
            : "This request could not be completed. Please try again.",
      },
      400,
    );
  }
}
