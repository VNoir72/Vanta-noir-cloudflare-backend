import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { Miniflare } from "./miniflare.mjs";
import { mkdir, readFile } from "node:fs/promises";
test("customer accounts isolate data, consume OTP once, revoke sessions and protect transfer initialization", async () => {
  await mkdir("work", { recursive: true });
  await build({
    entryPoints: ["tests/customer-app-worker.ts"],
    outfile: "work/customer-app.mjs",
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    conditions: ["workerd", "browser"],
    external: ["cloudflare:workers"],
  });
  const codes = new Map();
  let charges = 0,
    ambiguous = false;
  const mf = new Miniflare({
    modules: true,
    scriptPath: "work/customer-app.mjs",
    compatibilityDate: "2026-10-08",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: ["DB"],
    bindings: {
      CUSTOMER_APP_ENABLED: "true",
      CUSTOM_TRANSFER_ENABLED: "true",
      RESEND_API_KEY: "re_local",
      EMAIL_FROM: "test@example.com",
      PAYSTACK_SECRET_KEY: "sk_test_local",
    },
    outboundService: async (req) => {
      const body = await req.json();
      if (req.url === "https://api.resend.com/emails") {
        codes.set(body.to[0], body.text.match(/code is (\d{8})/)[1]);
        return Response.json({ id: "sent" });
      }
      assert.equal(req.url, "https://api.paystack.co/charge");
      charges++;
      assert.equal(body.amount, 123450);
      assert.equal(body.currency, "NGN");
      assert.equal(body.card, undefined);
      if (ambiguous)
        return Response.json(
          { status: false, message: "ambiguous" },
          { status: 503 },
        );
      return Response.json({
        status: true,
        data: {
          reference: body.reference,
          status: "pending_bank_transfer",
          bank: { name: "Test Bank" },
          account_number: "0123456789",
          account_name: "TEST MERCHANT",
          account_expires_at: new Date(Date.now() + 900000).toISOString(),
        },
      });
    },
  });
  try {
    const db = await mf.getD1Database("DB");
    const schema = await readFile("drizzle/0017_customer_app.sql", "utf8");
    await db.batch(
      schema
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => db.prepare(s)),
    );
    await db.batch([
      db.prepare(
        "CREATE TABLE request_limits(key TEXT PRIMARY KEY,hits INTEGER,expires_at INTEGER)",
      ),
      db.prepare("CREATE TABLE store_meta(key TEXT PRIMARY KEY,value TEXT)"),
      db.prepare(
        "CREATE TABLE orders(id TEXT PRIMARY KEY,reference TEXT UNIQUE,email TEXT,total_kobo INTEGER,status TEXT,payment_status TEXT,created_at TEXT,carrier TEXT,tracking_number TEXT,tracking_url TEXT,delivery_estimate TEXT)",
      ),
    ]);
    const request = async (path, method = "GET", body, token) => {
      const r = await mf.dispatchFetch("https://test/api/customer/" + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: r.status, data: await r.json() };
    };
    const login = async (email) => {
      const c = await request("code", "POST", { email });
      assert.equal(c.status, 200);
      const v = {
        challenge: c.data.challenge,
        code: codes.get(email),
        acceptTerms: true,
      };
      const responses = await Promise.all([
        request("verify", "POST", v),
        request("verify", "POST", v),
      ]);
      assert.equal(
        responses.filter((r) => r.status === 200).length,
        1,
        "OTP consumed atomically",
      );
      return responses.find((r) => r.status === 200).data.token;
    };
    const a = await login("a@example.com"),
      b = await login("b@example.com");
    assert.equal((await request("me")).status, 401);
    assert.equal(
      (
        await request(
          "me",
          "PATCH",
          { name: "Alice", addresses: [], favourites: ["tee"] },
          a,
        )
      ).status,
      200,
    );
    assert.equal(
      (await request("me", "GET", undefined, b)).data.customer.name,
      "",
    );
    const customer = await db
      .prepare("SELECT id FROM app_customers WHERE email='a@example.com'")
      .first();
    await db
      .prepare(
        "INSERT INTO orders(id,reference,email,total_kobo,status,payment_status,created_at) VALUES('1','VN-TEST','a@example.com',123450,'pending_payment','pending',CURRENT_TIMESTAMP)",
      )
      .run();
    await db
      .prepare(
        "INSERT INTO app_customer_orders(customer_id,reference) VALUES(?,'VN-TEST')",
      )
      .bind(customer.id)
      .run();
    assert.equal(
      (await request("orders", "GET", undefined, a)).data.orders.length,
      1,
    );
    assert.equal(
      (await request("orders", "GET", undefined, b)).data.orders.length,
      0,
    );
    assert.equal(
      (await request("receipt?reference=VN-TEST", "GET", undefined, b)).status,
      404,
    );
    const transfer = async () => {
      const r = await mf.dispatchFetch("https://test/transfer", {
        method: "POST",
        body: JSON.stringify({ reference: "VN-TEST", receiptToken: "fixture" }),
      });
      return r.json();
    };
    const attempts = await Promise.all([transfer(), transfer(), transfer()]);
    assert.equal(charges, 1);
    assert.ok(attempts.some((r) => r.transfer?.accountNumber === "0123456789"));
    assert.equal((await transfer()).transfer.amountKobo, 123450);
    assert.equal(charges, 1);
    await db
      .prepare("DELETE FROM store_meta WHERE key='checkout-payment:VN-TEST'")
      .run();
    ambiguous = true;
    assert.equal((await transfer()).checking, true);
    assert.equal((await transfer()).checking, true);
    assert.equal(charges, 2, "No blind retry after upstream uncertainty");
    await db
      .prepare("UPDATE app_sessions SET created_at=0 WHERE customer_id=?")
      .bind(customer.id)
      .run();
    assert.equal(
      (await request("me", "DELETE", { confirmation: "DELETE" }, a)).status,
      403,
    );
    const renewed = await login("a@example.com");
    assert.equal(
      (await request("me", "DELETE", { confirmation: "DELETE" }, renewed))
        .status,
      200,
    );
    assert.equal((await request("me", "GET", undefined, a)).status, 401);
    assert.equal((await request("me", "GET", undefined, renewed)).status, 401);
    assert.equal((await request("me", "GET", undefined, b)).status, 200);
    assert.ok(
      await db
        .prepare("SELECT id FROM orders WHERE reference='VN-TEST'")
        .first(),
      "Required order records remain",
    );
    const del = await request('code','POST',{email:'absent@example.com',purpose:'deletion'});
    assert.equal(del.status,200);
    const noAccount=await request('verify','POST',{challenge:del.data.challenge,code:codes.get('absent@example.com')});
    assert.equal(noAccount.status,404);
    assert.equal(await db.prepare("SELECT id FROM app_customers WHERE email='absent@example.com'").first(),null);
    assert.equal((await request("logout", "POST", {}, b)).status, 200);
    assert.equal((await request("me", "GET", undefined, b)).status, 401);
  } finally {
    await mf.dispose();
  }
});
