import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { Miniflare } from "./miniflare.mjs";
import { mkdir, readFile } from "node:fs/promises";
test("customer accounts isolate data and cards, encrypt tokens, enforce consent, revoke sessions and prevent duplicate charges", async () => {
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
  let cardCharges=0, reusable=true, providerEmail="a@example.com", providerAmount=123450, providerMode="test";
  const mf = new Miniflare({
    modules: true,
    scriptPath: "work/customer-app.mjs",
    compatibilityDate: "2026-10-08",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: ["DB"],
    bindings: {
      CUSTOMER_APP_ENABLED: "true",
      CUSTOM_TRANSFER_ENABLED: "true",
      SAVED_CARDS_ENABLED:"true",
      APP_CARD_ENCRYPTION_KEY:"11".repeat(32),
      RESEND_API_KEY: "re_local",
      EMAIL_FROM: "test@example.com",
      PAYSTACK_SECRET_KEY: "sk_test_local",
    },
    outboundService: async (req) => {
      if(req.url.startsWith("https://api.paystack.co/transaction/verify/"))return Response.json({status:true,data:{reference:"VN-CARD",status:"success",domain:providerMode,amount:providerAmount,currency:"NGN",customer:{email:providerEmail},authorization:{authorization_code:"AUTH_testtoken",signature:"SIG_test",reusable,channel:"card",last4:"1234",brand:"visa",exp_month:"12",exp_year:"2099"}}});
      const body = await req.json();
      if(req.url==="https://api.paystack.co/transaction/charge_authorization"){
        cardCharges++;assert.equal(body.authorization_code,"AUTH_testtoken");assert.equal(body.amount,123450);assert.equal(body.email,"a@example.com");assert.equal(body.currency,"NGN");
        return Response.json({status:false,message:"ambiguous"},{status:503});
      }
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
    const schema = await readFile("drizzle/0017_customer_app.sql", "utf8") + await readFile("drizzle/0018_customer_cards.sql", "utf8");
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
    await db.batch([
      db.prepare('CREATE TABLE order_items(order_id TEXT,product_id TEXT,product_name TEXT)'),
      db.prepare("CREATE TABLE product_reviews(id TEXT PRIMARY KEY,product_id TEXT,order_id TEXT,display_name TEXT,rating INTEGER,fit TEXT,body TEXT,status TEXT DEFAULT 'pending',UNIQUE(order_id,product_id))"),
      db.prepare('CREATE TABLE reward_campaigns(id TEXT PRIMARY KEY,config_json TEXT,active INTEGER,starts_at TEXT,ends_at TEXT)'),
      db.prepare('CREATE TABLE order_rewards(order_id TEXT,campaign_id TEXT)')
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
    // The app cannot fall back to a guest order when its session is missing.
    const nativeCheckout = await mf.dispatchFetch("https://test/api/checkout", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({client:"native",paymentChannel:"bank_transfer",expectedTotalKobo:123450,
        customer:{email:"buyer@example.com",firstName:"Test",lastName:"Buyer",phone:"08012345678",addressLine1:"10 Test Street",addressLine2:"",city:"Kaduna",state:"Kaduna",postalCode:"800001",countryCode:"NG"},
        cart:[{variantId:"variant-test",quantity:1}]})
    });
    assert.equal(nativeCheckout.status,401);
    assert.match((await nativeCheckout.json()).error,/Sign in/);
    assert.equal(charges,0,"unauthenticated native checkout cannot charge a customer");
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
    await db.prepare("INSERT INTO orders(id,reference,email,total_kobo,status,payment_status,created_at) VALUES('2','VN-CARD','a@example.com',123450,'paid','paid',CURRENT_TIMESTAMP)").run();
    await db.prepare("INSERT INTO app_customer_orders(customer_id,reference) VALUES(?,'VN-CARD')").bind(customer.id).run();
    const save=()=>request("cards","POST",{reference:"VN-CARD",consent:true},a);
    assert.equal((await request("cards")).status,401);
    assert.equal((await request("cards","POST",{reference:"VN-CARD",consent:false},a)).status,400);
    assert.equal((await request("cards","POST",{reference:"VN-CARD",consent:true},b)).status,400);
    reusable=false;assert.equal((await save()).status,400);reusable=true;
    providerEmail="b@example.com";assert.equal((await save()).status,400);providerEmail="a@example.com";
    providerAmount=1;assert.equal((await save()).status,400);providerAmount=123450;
    providerMode="live";assert.equal((await save()).status,400);providerMode="test";
    const saves=await Promise.all([save(),save()]);
    assert.ok(saves.every(r=>r.status===200));
    const saved=(await request("cards","GET",undefined,a)).data;
    assert.equal(saved.cards.length,1);assert.equal(saved.cards[0].last4,"1234");
    assert.ok(!JSON.stringify(saved).includes("AUTH_"));assert.ok(!JSON.stringify(saved).includes("SIG_"));
    const stored=await db.prepare('SELECT * FROM app_customer_cards').first();
    assert.ok(!stored.authorization_cipher.includes('AUTH_testtoken'));
    assert.equal((await request("cards","GET",undefined,b)).data.cards.length,0);
    await request("cards","DELETE",{id:stored.id},b);
    assert.equal((await request("cards","GET",undefined,a)).data.cards.length,1);
    const charge=async(owner,id,reference="VN-TEST")=>mf.dispatchFetch("https://test/saved-card",{method:"POST",body:JSON.stringify({reference,receiptToken:"fixture",owner,id})});
    const other=await db.prepare("SELECT id FROM app_customers WHERE email='b@example.com'").first();
    assert.equal((await charge(other.id,stored.id)).status,400);assert.equal(cardCharges,0);
    assert.equal((await (await charge(customer.id,stored.id)).json()).checking,true);
    assert.equal(cardCharges,0,"existing transfer claim prevents a second charge via card");
    await db.prepare("DELETE FROM store_meta WHERE key='checkout-payment:VN-TEST'").run();
    await Promise.all([charge(customer.id,stored.id),charge(customer.id,stored.id),charge(customer.id,stored.id)]);
    await charge(customer.id,stored.id);
    assert.equal(cardCharges,1,"only one card charge even on concurrent requests and upstream uncertainty");
    await db.prepare('UPDATE app_customer_cards SET expiry_year=2000').run();
    assert.equal((await charge(customer.id,stored.id)).status,400);
    assert.equal((await request("cards","GET",undefined,a)).data.cards[0].expired,true);
    await request("cards","DELETE",{id:stored.id},a);
    assert.equal((await request("cards","GET",undefined,a)).data.cards.length,0);
    assert.equal((await save()).status,200);
    await db.prepare("UPDATE orders SET status='delivered' WHERE reference='VN-CARD'").run();
    await db.prepare("INSERT INTO order_items VALUES('2','tee','Vanta Tee')").run();
    const campaign={id:'offer-a',title:'Assigned reward',active:true,shippingMinimumKobo:100000,giftMinimumKobo:null,countries:['NG'],startsAt:'2026-01-01T00:00:00.000Z',endsAt:'2099-12-31T00:00:00.000Z',access:'code',code:'ONLYALICE',recipientEmail:'a@example.com',maxUses:0};
    await db.prepare('INSERT INTO reward_campaigns VALUES(?,?,1,?,?)').bind(campaign.id,JSON.stringify(campaign),campaign.startsAt,campaign.endsAt).run();
    const centerA=await request('center','GET',undefined,a),centerB=await request('center','GET',undefined,b);
    assert.equal(centerA.status,200);assert.equal(centerA.data.toReview.length,1);assert.equal(centerA.data.coupons[0].code,'ONLYALICE');
    assert.equal(centerB.data.toReview.length,0);assert.equal(centerB.data.coupons.length,0);
    const review={reference:'VN-CARD',productId:'tee',displayName:'Alice',rating:5,fit:'true_to_size',body:'The garment fits really well.'};
    assert.equal((await request('reviews','POST',review,b)).status,404);
    assert.equal((await request('reviews','POST',{...review,reference:'VN-TEST'},a)).status,400);
    assert.equal((await request('reviews','POST',review,a)).status,201);
    assert.equal((await request('reviews','POST',review,a)).status,400);
    assert.equal((await request('center','GET',undefined,a)).data.toReview.length,0);
    assert.equal((await db.prepare('SELECT status FROM product_reviews').first()).status,'pending');
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
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM app_customer_cards").first()).n,0,"account deletion removes payment tokens");
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
