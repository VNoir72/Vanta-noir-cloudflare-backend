import {recordPresence,growthConfig} from './growth';
import {circleMembership,circleStart,circleVerify,circleManage,circleBeforeDeletion} from './circle';
import {phoneStatus,phoneSend,phoneVerify} from './phone-verification';
import {memberHub,setMemberWatch} from './app-members';
import {appAccessContext} from './app-attestation';
import {restartPayment} from './restart-payment';
import {firebaseReady,verifyFirebaseCustomer,deleteFirebaseCustomer} from './firebase-customer';
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
    if(request.method==='GET'&&path==='auth-methods')return json({password:firebaseReady(),google:firebaseReady(),apple:firebaseReady()&&runtimeEnv().FIREBASE_APPLE_ENABLED==='true'});
    if(request.method==='POST'&&path==='firebase'){
      if(!firebaseReady())return json({error:'Additional sign-in methods are not available yet.'},503);
      const v=z.object({idToken:z.string().min(100).max(10000),acceptTerms:z.literal(true)}).strict().parse(await request.json());
      if(!await rateLimit(request,'customer-firebase',10,600))return json({error:'Please wait before signing in again.'},429);
      let identity;try{identity=await verifyFirebaseCustomer(v.idToken);}catch{return json({error:'Sign in again with a verified email address.'},401);}
      if(identity.provider==='apple.com'&&runtimeEnv().FIREBASE_APPLE_ENABLED!=='true')return json({error:'Apple sign-in is not available yet.'},503);
      const email=emailSchema.parse(identity.email),now=Date.now();
      await db.prepare('INSERT OR IGNORE INTO app_customers(id,email,created_at,terms_accepted_at) VALUES(?,?,?,?)').bind(crypto.randomUUID(),email,now,now).run();
      const customer=await db.prepare('SELECT id,email,name FROM app_customers WHERE email=?').bind(email).first<{id:string;email:string;name:string}>();
      if(!customer)throw Error('Account unavailable');
      const binding=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind('firebase-customer:'+customer.id).first<{value:string}>();
      if(binding&&binding.value!==identity.uid)return json({error:'Use your existing sign-in method or contact support to link accounts.'},409);
      const token=crypto.randomUUID()+'-'+crypto.randomUUID();
      await db.batch([db.prepare('INSERT OR IGNORE INTO store_meta(key,value) VALUES(?,?)').bind('firebase-customer:'+customer.id,identity.uid),db.prepare('INSERT INTO app_sessions(digest,customer_id,created_at,expires_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM store_meta WHERE key=? AND value=?)').bind(await receiptDigest(token),customer.id,identity.authenticatedAt,now+30*86400000,'firebase-customer:'+customer.id,identity.uid)]);
      const linked=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind('firebase-customer:'+customer.id).first<{value:string}>();
      if(linked?.value!==identity.uid)return json({error:'Use your existing sign-in method.'},409);
      return json({token,customer,expiresAt:now+30*86400000});
    }
    if (request.method === "POST" && path === "code") {
      const { email, purpose } = z
        .object({ email: emailSchema, purpose:z.enum(['signin','deletion']).default('signin') })
        .parse(await request.json());
      const env = runtimeEnv();
      if (!env.RESEND_API_KEY || !env.EMAIL_FROM)
        return json({ error: "Sign-in email is unavailable." }, 503);
      const limitRequest = new Request(request.url, {
        headers: { "cf-connecting-ip": email },
      });
      if (
        !(await rateLimit(request, "customer-code", 5, 600)) ||
        !(await rateLimit(limitRequest, "customer-code-email", 3, 600))
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
          subject: "Your Vanta Noir sign-in code",
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
      if(challenge.purpose!=='deletion'&&v.acceptTerms!==true)return json({error:'Please accept the terms before continuing.'},400);
      const claimed = await db
        .prepare("DELETE FROM app_login_challenges WHERE id=? RETURNING email")
        .bind(v.challenge)
        .first<{ email: string }>();
      if (!claimed)
        return json({ error: "That code has already been used." }, 400);
      const id = crypto.randomUUID(),
        now = Date.now(),
        token = crypto.randomUUID() + "-" + crypto.randomUUID();
      if(challenge.purpose!=='deletion')await db
        .prepare(
          "INSERT OR IGNORE INTO app_customers(id,email,created_at,terms_accepted_at) VALUES(?,?,?,?)",
        )
        .bind(id, claimed.email, now, now)
        .run();
      const customer = await db
        .prepare("SELECT id,email,name FROM app_customers WHERE email=?")
        .bind(claimed.email)
        .first<{ id: string; email: string; name: string }>();
      if(!customer)return json({error:'No account exists for this email.'},404);
      await db.batch([
        db.prepare("DELETE FROM app_sessions WHERE expires_at<?").bind(now),
        db
          .prepare(
            "INSERT INTO app_sessions(digest,customer_id,created_at,expires_at) VALUES(?,?,?,?)",
          )
          .bind(
            await receiptDigest(token),
            customer!.id,
            now,
            now + 30 * 86400000,
          ),
      ]);
      return json({ token, customer, expiresAt: now + 30 * 86400000 });
    }
    const s = await appSession(request);
    if (!s) return json({ error: "Please sign in again." }, 401);
    if(path==='presence'&&request.method==='POST')return json(await recordPresence(request,s.id,await request.json()));
    if(path==='phone'&&request.method==='GET')return json(await phoneStatus(s.id));
    if(path==='phone/send'&&request.method==='POST')return json(await phoneSend(request,s.id));
    if(path==='phone/verify'&&request.method==='POST')return json(await phoneVerify(s.id,await request.json()));
    if(path==='circle'||path.startsWith('circle/')){
      const access=await appAccessContext(request);if(!access.verifiedApp)return json({error:'Circle is available only in the verified Vanta Noir app.'},403);
      if(path==='circle'&&request.method==='GET'){const config=await growthConfig();return json({config:config.circle,version:config.version,membership:await circleMembership(s.id)});}
      if(path==='circle/start'&&request.method==='POST')return json(await circleStart(s.id,s.email,await request.json()));
      if(path==='circle/verify'&&request.method==='POST'){const v=z.object({reference:z.string().max(150)}).strict().parse(await request.json());try{return json(await circleVerify(v.reference,s.id));}catch{return json({error:"Your membership payment is not confirmed yet. If you have paid, do not pay again. Refresh your membership shortly or contact support with your payment reference."},409);}}
      if(path==='circle/manage'&&request.method==='POST')return json(await circleManage(s.id));
      return json({error:'Method not allowed.'},405);
    }
    if(path==='push'&&['POST','DELETE'].includes(request.method)){
      const {token}=z.object({token:z.string().regex(/^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]+\]$/).max(200)}).strict().parse(await request.json());
      await registerPush(s.id,token,request.method==='DELETE');return json({registered:request.method==='POST'});
    }
    if (path === "me" && request.method === "GET") {
      const profile=await db.prepare("SELECT value FROM store_meta WHERE key=?").bind("customer-profile:"+s.id).first<{value:string}>();
      const phone=profile?JSON.parse(profile.value).phone||"":"";
      return json({
        customer: {
          email: s.email,
          name: s.name,
          phone,
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
      const v = z
        .object({
          name: z.string().trim().max(100),
          phone: z.string().trim().max(30).refine(v=>!v||/^\+?[0-9 ()-]{7,30}$/.test(v),"Enter a valid phone number.").optional(),
          addresses: z.array(checkoutCustomerSchema).max(5),
          favourites: z.array(z.string().max(160)).max(200),
        })
        .parse(await request.json());
      const updates=[db.prepare("UPDATE app_customers SET name=?,addresses_json=?,favourites_json=? WHERE id=?").bind(v.name,JSON.stringify(v.addresses),JSON.stringify([...new Set(v.favourites)]),s.id)];
      if(v.phone!==undefined)updates.push(db.prepare("INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind("customer-profile:"+s.id,JSON.stringify({phone:v.phone})));
      await db.batch(updates);
      return json({ saved: true });
    }
    if (path === "logout" && request.method === "POST") {
      await db
        .prepare("DELETE FROM app_sessions WHERE digest=?")
        .bind(
          await receiptDigest(request.headers.get("Authorization")!.slice(7)),
        )
        .run();
      return json({ signedOut: true });
    }
    if (path === "me" && request.method === "DELETE") {
      if (Date.now() - s.authenticatedAt > 600000)
        return json(
          {
            error: "Sign in with a fresh email code, then delete your account.",
          },
          403,
        );
      const v = z
        .object({ confirmation: z.literal("DELETE") })
        .parse(await request.json());
      void v;
      const firebase=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind('firebase-customer:'+s.id).first<{value:string}>();
      if(firebase)await deleteFirebaseCustomer(firebase.value);
      // Explicit cleanup also covers deployments with foreign-key enforcement disabled.
      const cardsTable=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_customer_cards'").first();
      await circleBeforeDeletion(s.id);
      await db.batch([
        db.prepare("DELETE FROM store_meta WHERE (key LIKE 'presence:%' OR key LIKE 'activity:%') AND json_extract(value,'$.customerId')=?").bind(s.id),
        db.prepare('DELETE FROM store_meta WHERE key IN (?,?)').bind('phone-verified:'+s.id,'phone-challenge:'+s.id),
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
      return json({
        deleted: true,
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
