import {generateKeyPair,exportJWK,exportPKCS8,SignJWT} from 'jose';
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
  const {publicKey,privateKey}=await generateKeyPair('RS256',{extractable:true}),jwk=await exportJWK(publicKey);jwk.kid='fixture';
  const codes = new Map();
  let charges = 0,
    ambiguous = false;
  let transferAmount=125900, transferRequested=123450, transferVerifyFails=false;
  let providerRequested, providerFees;
  let cardCharges=0, reusable=true, providerEmail="a@example.com", providerAmount=123450, providerMode="test";
  const mf = new Miniflare({
    modules: true,
    scriptPath: "work/customer-app.mjs",
    compatibilityDate: "2026-10-08",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: ["DB"],
    bindings: {
      CUSTOMER_APP_ENABLED: "true",
      FIREBASE_AUTH_ENABLED:'true',FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify({project_id:'vanta-noir',client_email:'fixture@example.com',private_key:await exportPKCS8(privateKey)}),
      CUSTOM_TRANSFER_ENABLED: "true",
      SAVED_CARDS_ENABLED:"true",
      APP_CARD_ENCRYPTION_KEY:"11".repeat(32),
      RESEND_API_KEY: "re_local",
      EMAIL_FROM: "test@example.com",
      PAYSTACK_SECRET_KEY: "sk_test_local",
    },
    outboundService: async (req) => {
      if(req.url.includes('/jwk/securetoken@'))return Response.json({keys:[jwk]});
      if(req.url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'fixture',expires_in:3600});
      if(req.url.endsWith('accounts:lookup')){const b=await req.json();return Response.json({users:[{localId:b.localId[0],email:b.localId[0],emailVerified:true,validSince:'0'}]});}
      if(req.url.endsWith('accounts:delete'))return Response.json({});
      if(req.url === 'https://api.paystack.co/transaction/verify/VN-TEST') {
        if(transferVerifyFails)return Response.json({status:false,message:'Unavailable'},{status:503});
        return Response.json({status:true,data:{reference:'VN-TEST',status:'ongoing',domain:'test',currency:'NGN',amount:transferAmount,requested_amount:transferRequested}});
      }
      if(req.url.startsWith("https://api.paystack.co/transaction/verify/"))return Response.json({status:true,data:{reference:"VN-CARD",status:"success",domain:providerMode,amount:providerAmount,requested_amount:providerRequested,fees:providerFees,currency:"NGN",customer:{email:providerEmail},authorization:{authorization_code:"AUTH_testtoken",signature:"SIG_test",reusable,channel:"card",last4:"1234",brand:"visa",exp_month:"12",exp_year:"2099"}}});
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
        "CREATE TABLE orders(id TEXT PRIMARY KEY,reference TEXT UNIQUE,email TEXT,total_kobo INTEGER,status TEXT,payment_status TEXT,created_at TEXT,updated_at TEXT,carrier TEXT,tracking_number TEXT,tracking_url TEXT,delivery_estimate TEXT)",
      ),
    ]);
    await db.batch([
      db.prepare('CREATE TABLE order_items(order_id TEXT,product_id TEXT,product_name TEXT,variant_id TEXT,color TEXT,size TEXT,quantity INTEGER,unit_price_kobo INTEGER)'),
      db.prepare("CREATE TABLE product_reviews(id TEXT PRIMARY KEY,product_id TEXT,order_id TEXT,display_name TEXT,rating INTEGER,fit TEXT,body TEXT,status TEXT DEFAULT 'pending',UNIQUE(order_id,product_id))"),
      db.prepare('CREATE TABLE stock_reservations(order_id TEXT)'),
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
      const now=Math.floor(Date.now()/1000);
      const idToken=await new SignJWT({sub:email,email,email_verified:true,auth_time:now,firebase:{sign_in_provider:'password'}}).setProtectedHeader({alg:'RS256',kid:'fixture'}).setIssuer('https://securetoken.google.com/vanta-noir').setAudience('vanta-noir').setIssuedAt().setExpirationTime('1h').sign(privateKey);
      const result=await request('firebase','POST',{idToken,acceptTerms:true});assert.equal(result.status,200,JSON.stringify(result.data));return result.data.token;
    };
    const a = await login("a@example.com"),
      b = await login("b@example.com");
    assert.equal((await request("me")).status, 401);
    assert.equal((await request('sessions')).status,401);
    const otherA=await login('a@example.com');
    const sessionsA=await request('sessions','GET',undefined,a);
    assert.equal(sessionsA.status,200);assert.equal(sessionsA.data.sessions.length,2);
    assert.equal(sessionsA.data.sessions.filter(s=>s.current).length,1);
    const otherId=sessionsA.data.sessions.find(s=>!s.current).id;
    assert.equal((await request('sessions','DELETE',{id:otherId},b)).status,200);
    assert.equal((await request('me','GET',undefined,otherA)).status,200,'another customer cannot revoke this session');
    assert.equal((await request('sessions','DELETE',{id:sessionsA.data.sessions.find(s=>s.current).id},a)).status,400);
    assert.equal((await request('sessions','DELETE',{id:otherId},a)).status,200);
    assert.equal((await request('me','GET',undefined,otherA)).status,401,'revocation invalidates the bearer session');
    assert.equal(
      (
        await request(
          "me",
          "PATCH",
          { name: "Alice", phone:"+2348000000000", addresses: [], favourites: ["tee"] },
          a,
        )
      ).status,
      200,
    );
    assert.equal(
      (await request("me", "GET", undefined, b)).data.customer.name,
      "",
    );
    assert.equal((await request("me","GET",undefined,a)).data.customer.phone,"+2348000000000");
    assert.equal((await request("me","GET",undefined,b)).data.customer.phone,"");
    assert.equal((await request("me","PATCH",{name:"Alice",phone:"not-a-phone",addresses:[],favourites:[]},a)).status,400);
    assert.equal((await request("me","PATCH",{name:"Alice",addresses:[],favourites:["tee"]},a)).status,200);
    assert.equal((await request("me","GET",undefined,a)).data.customer.phone,"+2348000000000","legacy clients preserve contact phone");
    const address={email:'a@example.com',firstName:'Alice',lastName:'Customer',phone:'+2348000000000',addressLine1:'12 Example Road',addressLine2:'',city:'Lagos',state:'Lagos',countryCode:'NG',postalCode:''};
    assert.equal((await request('me','PATCH',{addresses:[address],expectedAddresses:[]},a)).status,200);
    assert.equal((await request('me','PATCH',{name:'Alice updated',favourites:['tee']},a)).status,200);
    assert.deepEqual((await request('me','GET',undefined,a)).data.customer.addresses,[address],'unrelated profile edits preserve saved addresses');
    assert.equal((await request('me','PATCH',{addresses:[],expectedAddresses:[]},a)).status,409,'stale device cannot delete saved addresses');
    assert.equal((await request('me','PATCH',{addresses:[]},a)).status,409,'legacy full-profile payload cannot wipe addresses');
    assert.equal((await request('me','PATCH',{addresses:[],expectedAddresses:[address]},a)).status,200,'intentional current address deletion works');
    // Historical records may omit schema defaults and use another JSON key order.
    const legacyAddress={city:'Lagos',state:'Lagos',addressLine1:'12 Example Road',phone:address.phone,lastName:'Customer',firstName:'Alice',email:'a@example.com'};
    await db.prepare("UPDATE app_customers SET addresses_json=? WHERE email='a@example.com'").bind(JSON.stringify([legacyAddress],null,2)).run();
    assert.equal((await request('me','PATCH',{name:'Legacy account',addresses:[legacyAddress]},a)).status,200,'equivalent legacy snapshot is not a conflicting address edit');
    const revisedAddress={...address,addressLine1:'14 Example Road'};
    assert.equal((await request('me','PATCH',{addresses:[revisedAddress],expectedAddresses:[legacyAddress]},a)).status,200,'legacy defaults and JSON key order do not block intentional edits');
    assert.equal((await request('me','PATCH',{addresses:[],expectedAddresses:[legacyAddress]},a)).status,409,'normalized stale snapshot still cannot delete newer address');
    assert.deepEqual((await request('me','GET',undefined,a)).data.customer.addresses,[revisedAddress]);
    const customer = await db
      .prepare("SELECT id FROM app_customers WHERE email='a@example.com'")
      .first();
    const circleUntil=Date.now()+86400000;
    await db.prepare('INSERT INTO store_meta(key,value) VALUES(?,?)').bind('circle-receipt:web-status-fixture',JSON.stringify({customerId:customer.id,reference:'private-reference',amount:500000,paidAt:Date.now(),until:circleUntil})).run();
    const webCircle=await request('circle/status','GET',undefined,a);
    assert.equal(webCircle.status,200,'web account may read its own membership without app attestation');
    assert.deepEqual(webCircle.data,{membership:{active:true,until:circleUntil,cancelled:false}});
    assert.equal((await request('circle/status','GET',undefined,b)).data.membership.active,false,'membership does not leak between accounts');
    assert.equal((await request('circle/start','POST',{version:1,recurringConsent:true},a)).status,403,'web cannot enrol through the app-only route');
    assert.equal((await request('circle/history','GET',undefined,a)).status,403,'status access does not unlock app billing endpoints');
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
    assert.equal((await transfer()).transfer.amountKobo, 125900, 'Display provider total including customer-paid fees');
    assert.equal(charges, 1);
    // Old cached instructions and verification outages must never trigger a
    // second charge or expose the unconfirmed order total as transfer amount.
    const cached=JSON.parse((await db.prepare("SELECT value FROM store_meta WHERE key='checkout-payment:VN-TEST'").first()).value);
    const legacy=JSON.stringify({transfer:{...cached.transfer,amountKobo:123450}});
    await db.prepare("UPDATE store_meta SET value=? WHERE key='checkout-payment:VN-TEST'").bind(legacy).run();
    transferVerifyFails=true;
    assert.equal((await transfer()).checking,true);
    transferVerifyFails=false;transferRequested=999;
    assert.equal((await transfer()).checking,true,'Reject mismatched provider principal');
    transferRequested=123450;
    assert.equal((await transfer()).transfer.amountKobo,125900,'Repair legacy cached amount');
    assert.equal(charges,1,'Recovery must reuse the existing charge');
    await db.prepare("UPDATE store_meta SET value=? WHERE key='checkout-payment:VN-TEST'").bind(legacy).run();
    transferAmount=123450;transferRequested=null;
    assert.equal((await transfer()).transfer.amountKobo,123450,'Exact amount works without a surcharge');
    await db
      .prepare("DELETE FROM store_meta WHERE key='checkout-payment:VN-TEST'")
      .run();
    ambiguous = true;
    assert.equal((await transfer()).checking, true);
    assert.equal((await transfer()).checking, true);
    assert.equal(charges, 2, "No blind retry after upstream uncertainty");
    assert.equal((await request('orders','DELETE',{reference:'VN-TEST'},b)).status,404);
    assert.equal((await request('orders','DELETE',{reference:'VN-TEST'},a)).status,200);
    assert.equal((await request('orders','GET',undefined,a)).data.orders.length,0);
    assert.ok(await db.prepare("SELECT id FROM orders WHERE reference='VN-TEST'").first(),'Removing from history preserves the store record');
    assert.equal((await request('orders?deleted=true','GET',undefined,a)).data.orders.length,1);
    assert.equal((await request('orders?deleted=true','GET',undefined,b)).data.orders.length,0);
    assert.equal((await request('orders','PATCH',{reference:'VN-TEST'},b)).status,404);
    assert.equal((await request('push','POST',{token:'not-a-token'},a)).status,400);
    assert.equal((await request('push','POST',{token:'ExpoPushToken[test_device]'},a)).status,200);
    assert.equal((await request('push','DELETE',{token:'ExpoPushToken[test_device]'},b)).status,200);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM store_meta WHERE key LIKE 'push-device:%'").first()).n,1,'Another customer cannot unregister this device');
    assert.equal((await request('push','DELETE',{token:'ExpoPushToken[test_device]'},a)).status,200);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM store_meta WHERE key LIKE 'push-device:%'").first()).n,0);

    assert.equal((await request('orders','PATCH',{reference:'VN-TEST'},a)).status,200);
    assert.equal((await request('orders?deleted=true','GET',undefined,a)).data.orders.length,0);
    assert.equal((await request('orders','GET',undefined,a)).data.orders.length,1);

    assert.equal((await request('orders','DELETE',{reference:'VN-TEST',permanent:true},a)).status,409);
    assert.equal((await request('orders','DELETE',{reference:'VN-TEST'},a)).status,200);
    assert.equal((await request('orders','DELETE',{reference:'VN-TEST',permanent:true},b)).status,404);
    assert.equal((await request('orders','DELETE',{reference:'VN-TEST',permanent:true},a)).status,200);
    assert.equal((await request('orders?deleted=true','GET',undefined,a)).data.orders.length,0);
    assert.equal((await request('orders','GET',undefined,a)).data.orders.length,0);
    assert.equal((await request('orders','PATCH',{reference:'VN-TEST'},a)).status,409);
    assert.ok(await db.prepare("SELECT id FROM orders WHERE reference='VN-TEST'").first(),'Permanent history removal retains the business record');

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
    providerAmount=125900;providerRequested=123450;providerFees=2450;
    assert.equal((await save()).status,200,"A verified customer-paid fee must not prevent saving a card");
    providerFees=2449;assert.equal((await save()).status,400,"Reject unexplained amount differences");
    providerFees=2450;providerRequested=123449;assert.equal((await save()).status,400,"Reject mismatched principal");
    providerAmount=123450;providerRequested=undefined;providerFees=undefined;
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
    await db.prepare("INSERT INTO order_items(order_id,product_id,product_name) VALUES('2','tee','Vanta Tee')").run();
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
