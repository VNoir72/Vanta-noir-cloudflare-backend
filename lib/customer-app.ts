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
export async function appSession(request: Request) {
  if(runtimeEnv().CUSTOMER_APP_ENABLED!=='true')return null;
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token || !tokenPattern.test(token)) return null;
  return getDbBinding()
    .prepare(
      `SELECT c.id,c.email,c.name,c.addresses_json,c.favourites_json,s.created_at AS authenticatedAt
 FROM app_sessions s JOIN app_customers c ON c.id=s.customer_id WHERE s.digest=? AND s.expires_at>?`,
    )
    .bind(await receiptDigest(token), Date.now())
    .first<{
      id: string;
      email: string;
      name: string;
      addresses_json: string;
      favourites_json: string;
      authenticatedAt: number;
    }>();
}
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
    if (path === "me" && request.method === "GET")
      return json({
        customer: {
          email: s.email,
          name: s.name,
          addresses: JSON.parse(s.addresses_json),
          favourites: JSON.parse(s.favourites_json),
        },
      });
    if (path === "me" && request.method === "PATCH") {
      const v = z
        .object({
          name: z.string().trim().max(100),
          addresses: z.array(checkoutCustomerSchema).max(5),
          favourites: z.array(z.string().max(160)).max(200),
        })
        .parse(await request.json());
      await db
        .prepare(
          "UPDATE app_customers SET name=?,addresses_json=?,favourites_json=? WHERE id=?",
        )
        .bind(
          v.name,
          JSON.stringify(v.addresses),
          JSON.stringify([...new Set(v.favourites)]),
          s.id,
        )
        .run();
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
      await db.batch([
        db.prepare("DELETE FROM app_sessions WHERE customer_id=?").bind(s.id),
        db
          .prepare("DELETE FROM app_customer_orders WHERE customer_id=?")
          .bind(s.id),
        db
          .prepare("DELETE FROM app_login_challenges WHERE email=?")
          .bind(s.email),
        db.prepare("DELETE FROM app_customers WHERE id=?").bind(s.id),
      ]);
      return json({
        deleted: true,
        message:
          "Account, addresses and favourites deleted. Required transaction records are retained under our published retention policy.",
      });
    }
    if (path === "orders" && request.method === "GET") {
      const rows = await db
        .prepare(
          `SELECT o.reference,o.status,o.payment_status AS paymentStatus,o.total_kobo AS totalKobo,o.created_at AS createdAt,o.carrier,o.tracking_number AS trackingNumber,o.tracking_url AS trackingUrl,o.delivery_estimate AS deliveryEstimate
    FROM app_customer_orders a JOIN orders o ON o.reference=a.reference WHERE a.customer_id=? ORDER BY o.created_at DESC LIMIT 100`,
        )
        .bind(s.id)
        .all();
      return json({ orders: rows.results });
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
        ? json({ order: await getPublicPaymentOrder(reference) })
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
