import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { Miniflare } from "miniflare";
import { readFile, readdir, mkdir } from "node:fs/promises";
import { createHmac } from "node:crypto";
import { generateKeyPair, exportJWK, SignJWT } from "jose";

test("store backend: checkout, reservations, payment idempotency, privacy, CORS, and catalogue edits", async () => {
  await mkdir("work", { recursive: true });
  await build({ entryPoints: ["tests/store-worker.ts"], outfile: "work/store-test-worker.mjs", bundle: true, format: "esm", platform: "neutral", target: "es2022", conditions: ["workerd", "browser"], external: ["cloudflare:workers"] });
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const publicJwk = { ...await exportJWK(publicKey), kid: "local-access-test", alg: "RS256", use: "sig" };
  const issuer = "https://vanta-noir-test.cloudflareaccess.com";
  const accessToken = (email, audience = "test-audience", expiration = "5m") => new SignJWT({ email }).setProtectedHeader({ alg: "RS256", kid: publicJwk.kid }).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime(expiration).sign(privateKey);
  const mf = new Miniflare({ modules: true, scriptPath: "work/store-test-worker.mjs", compatibilityDate: "2026-05-15", compatibilityFlags: ["nodejs_compat"], d1Databases: ["DB"],
    bindings: { PAYSTACK_SECRET_KEY: "sk_test_local_verification_only", ADMIN_EMAIL: "owner@example.com", AUTH_PROVIDER: "cloudflare-access", CF_ACCESS_TEAM_DOMAIN: issuer, CF_ACCESS_AUD: "test-audience", STANDARD_SHIPPING_FEE_KOBO: "200000", STOREFRONT_URL: "https://vantanoir.store" },
    outboundService: async request => {
      if (request.url === `${issuer}/cdn-cgi/access/certs`) return Response.json({ keys: [publicJwk] });
      const body = await request.json();
      assert.equal(new URL(request.url).hostname, "api.paystack.co");
      assert.equal(body.callback_url, "https://vantanoir.store/checkout/complete");
      return Response.json({ status: true, data: { authorization_url: "https://checkout.paystack.com/local-test", reference: body.reference } });
    },
  });
  try {
    const db = await mf.getD1Database("DB");
    for (const file of (await readdir("drizzle")).filter(file => file.endsWith(".sql")).sort()) {
      const sql = (await readFile(`drizzle/${file}`, "utf8")).replaceAll("--> statement-breakpoint", "");
      await db.batch(sql.split(";").map(s => s.trim()).filter(Boolean).map(s => db.prepare(s)));
    }
    const rpc = async (action, ...args) => {
      const response = await mf.dispatchFetch("https://api.vantanoir.store/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, args }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    };
    const optionUrl="https://api.vantanoir.store/api/admin/catalog-options";
    assert.equal((await mf.dispatchFetch(optionUrl,{method:"POST",headers:{Origin:"https://api.vantanoir.store","Content-Type":"application/json"},body:JSON.stringify({kind:"color",name:"Ice Blue",hex:"#aaccff"})})).status,403);
    const ownerToken=await accessToken("owner@example.com");
    for(const option of [{kind:"color",name:"Ice Blue",hex:"#aaccff"},{kind:"category",name:"Technical Gilets",section:"Outerwear"}]){
      const response=await mf.dispatchFetch(optionUrl,{method:"POST",headers:{Origin:"https://api.vantanoir.store","Content-Type":"application/json","cf-access-jwt-assertion":ownerToken},body:JSON.stringify(option)});
      assert.equal(response.status,200);
    }
    const optionsResponse=await mf.dispatchFetch("https://api.vantanoir.store/api/catalog-options",{headers:{Origin:"https://vantanoir.store"}});
    assert.equal(optionsResponse.headers.get("Access-Control-Allow-Origin"),"https://vantanoir.store");
    const options=await optionsResponse.json();
    assert.equal(options.colors.find(c=>c.name==="Ice Blue").hex,"#aaccff");
    assert.equal(options.categories.find(c=>c.name==="Technical Gilets").section,"Outerwear");
    const customer = { email: "customer@example.com", firstName: "Test", lastName: "Customer", phone: "08000000000", addressLine1: "10 Test Street", addressLine2: "", city: "Lagos", state: "Lagos" };
    await rpc("importSeason01Catalogue");
    const catalogResponse = await mf.dispatchFetch("https://api.vantanoir.store/api/catalog", { headers: { Origin: "https://vantanoir.store" } });
    assert.equal(catalogResponse.headers.get("Access-Control-Allow-Origin"), "https://vantanoir.store");
    const { products, checkout: settings } = await catalogResponse.json();
    const completion = JSON.parse(await readFile("data/vd-completion-products.json", "utf8"));
    assert.equal(products.length, 78 + completion.length);
    for (const expected of completion) {
      const actual = products.find(p=>p.id===expected.id);
      assert.equal(actual.images.length, expected.images.length);
      assert.equal(actual.details.availability, "preview");
      assert.ok(actual.colorways.every(c=>Object.values(c.stock).every(n=>n===0)));
    }
    const viewUpdates = JSON.parse(await readFile("data/catalogue-view-updates.json", "utf8"));
    for (const update of viewUpdates) {
      const actual=products.find(p=>p.id===update.id);
      assert.deepEqual(new Set(actual.images.map(i=>i.imageUrl)),new Set(update.images.map(i=>i.imageUrl)));
    }
    if (completion.length) {
      const restored=products.find(p=>p.id===completion[0].id);
      const variant=Object.values(restored.colorways[0].variantIds)[0];
      await rpc("sql","UPDATE product_variants SET stock=7 WHERE id=?",variant);
      await rpc("sql","UPDATE products SET name='Merchant edited name' WHERE id=?",restored.id);
      await rpc("importVdCompletionCatalogue");
      assert.equal((await rpc("sql","SELECT stock FROM product_variants WHERE id=?",variant)).results[0].stock,7);
      assert.equal((await rpc("sql","SELECT name FROM products WHERE id=?",restored.id)).results[0].name,'Merchant edited name');
      assert.equal((await rpc("sql","SELECT COUNT(*) AS n FROM product_images WHERE product_id=?",restored.id)).results[0].n,restored.images.length);
    }
    await rpc("importVdCompletionCatalogue");
    assert.equal((await rpc("listCatalog")).length, products.length);
    for (const p of products.filter(p=>!p.id.startsWith("vn-p"))) for (const colorway of p.colorways.filter(c=>"S" in c.stock)) {
      assert.equal(colorway.stock.XXL, 0, "New XXL stock must not be invented");
      assert.ok(colorway.variantIds.XXL, "Every colour needs a persisted XXL variation");
    }
    const seasonProducts=products.filter(p=>p.id.startsWith("vn-season01-"));
    assert.equal(seasonProducts.length,26);
    for (const p of seasonProducts) {
      assert.equal(p.colorways.length,5);
      assert.equal(p.images.length,15);
      for (const c of p.colorways) {
        const views=p.images.filter(i=>i.color===c.name);
        assert.equal(views.length,3);
        for (const view of ["front","back","side"]) assert.ok(views.some(i=>i.imageUrl.endsWith(`-${view}.webp`)));
        assert.ok(Object.values(c.stock).every(stock=>stock===0));
      }
    }
    assert.equal(products.find(p=>p.id==="vn-season01-25").priceKobo,2000000);
    for(const id of ["vn-p042","vn-season01-21"]) {
      const cap=products.find(p=>p.id===id);
      assert.equal(cap.priceKobo,3000000);
      assert.equal(cap.details.priceStatus,"approved");
    }
    assert.equal((await rpc("sql","SELECT status FROM products WHERE id='vn-p050'")).results[0].status,"archived");
    const previewProduct=products.find(p=>p.id==="vn-season01-26");
    assert.equal(previewProduct.details.availability,"preview");
    assert.equal(previewProduct.priceKobo,1200000);
    assert.equal(previewProduct.category,"Underwear and socks");
    const previewVariant=previewProduct.colorways[0].variantIds.S;
    await rpc("sql","UPDATE product_variants SET stock=10 WHERE id=?",previewVariant);
    await rpc("importSeason01Catalogue");
    assert.equal((await rpc("sql","SELECT stock FROM product_variants WHERE id=?",previewVariant)).results[0].stock,10,"Import must preserve subsequent admin stock changes");
    assert.equal((await rpc("sql","SELECT COUNT(*) AS count FROM product_images WHERE product_id=?",previewProduct.id)).results[0].count,15,"Repeated import must not duplicate images");
    const previewOrder={customer,cart:[{variantId:previewVariant,quantity:1}],shippingKobo:200000,expectedTotalKobo:previewProduct.priceKobo+200000};
    await assert.rejects(rpc("createPendingOrder",previewOrder),/no longer available/,"A design preview cannot be ordered even if stock is entered early");
    await rpc("sql","UPDATE products SET details_json=json_set(details_json,'$.availability','in_stock') WHERE id=?",previewProduct.id);
    await assert.rejects(rpc("createPendingOrder",previewOrder),/no longer available/,"A proposed price cannot be charged until approved");
    await rpc("sql","UPDATE product_variants SET stock=0 WHERE id=?",previewVariant);
    const bagProduct=products.find(p=>p.id==="vn-season01-23");
    assert.deepEqual(Object.keys(bagProduct.colorways[0].stock),["One size"]);
    for(const p of products.filter(p=>p.id.startsWith("vn-design-"))){
      assert.equal(p.colorways.length,5);
      for(const c of p.colorways){const views=p.images.filter(i=>i.color===c.name);assert.equal(views.length,3);assert.ok(views.every(i=>i.imageAlt.includes(c.name)));}
    }
    assert.equal(settings.shippingFeeKobo, 200000);
    const product = products[0], color = product.colorways[0], size = Object.keys(color.stock)[0], id = color.variantIds[size];
    await rpc("sql", "UPDATE product_variants SET stock = 1 WHERE id = ?", id);
    const args = { customer, cart: [{ variantId: id, quantity: 1 }], shippingKobo: 200000, expectedTotalKobo: product.priceKobo + 200000 };
    await assert.rejects(rpc("createPendingOrder", { ...args, expectedTotalKobo: 1 }), /prices or delivery/);
    const simultaneous = await Promise.allSettled([rpc("createPendingOrder", args), rpc("createPendingOrder", args)]);
    assert.equal(simultaneous.filter(r => r.status === "fulfilled").length, 1, "Only one checkout can reserve the last item");
    const order = simultaneous.find(r => r.status === "fulfilled").value;
    let updated = await rpc("listCatalog");
    assert.equal(updated.find(p => p.id === product.id).colorways.find(c => c.name === color.name).stock[size], 0);
    await assert.rejects(rpc("markOrderPaid", { reference: order.reference, amountKobo: 1, eventKey: "wrong", eventType: "test" }), /amount mismatch/);
    const payment = { reference: order.reference, amountKobo: order.totalKobo, eventKey: "callback", eventType: "verify.success" };
    await Promise.all([rpc("markOrderPaid", payment), rpc("markOrderPaid", { ...payment, eventKey: "webhook" })]);
    assert.equal((await rpc("sql", "SELECT stock FROM product_variants WHERE id = ?", id)).results[0].stock, 0, "Duplicate payment handling must decrement once");
    const confirmed = await mf.dispatchFetch(`https://api.vantanoir.store/api/payments/verify?reference=${order.reference}`);
    const confirmation = await confirmed.json();
    assert.equal(confirmation.order.paymentStatus, "paid");
    assert.equal(confirmation.order.items[0].variantId, id);
    assert.equal(confirmation.order.email, undefined);
    assert.equal(confirmation.order.id, undefined);
    assert.equal(confirmed.headers.get("Cache-Control"), "no-store");
    const event = JSON.stringify({ event: "charge.success", data: { id: 42, status: "success", currency: "NGN", reference: order.reference, amount: order.totalKobo } });
    const signature = createHmac("sha512", "sk_test_local_verification_only").update(event).digest("hex");
    const hook = await mf.dispatchFetch("https://api.vantanoir.store/api/payments/webhook", { method: "POST", headers: { "x-paystack-signature": signature }, body: event });
    assert.equal(hook.status, 200);
    assert.equal((await mf.dispatchFetch("https://api.vantanoir.store/api/payments/webhook", { method: "POST", body: event })).status, 401);
    assert.equal((await mf.dispatchFetch("https://api.vantanoir.store/api/catalog", { headers: { Origin: "https://untrusted.example" } })).status, 403);
    assert.equal((await mf.dispatchFetch("https://api.vantanoir.store/api/checkout", { method: "OPTIONS", headers: { Origin: "https://www.vantanoir.store" } })).status, 204);
    const auth = await mf.dispatchFetch("https://api.vantanoir.store/auth", { headers: { "oai-authenticated-user-email": "owner@example.com" } });
    assert.equal((await auth.json()).ok, false, "Spoofed hosting identity headers must never grant independent admin access");
    for (const [email, audience, expiration, expected] of [
      ["owner@example.com", "test-audience", "5m", true],
      ["someone@example.com", "test-audience", "5m", false],
      ["owner@example.com", "wrong-audience", "5m", false],
      ["owner@example.com", "test-audience", "-1m", false],
    ]) {
      const response = await mf.dispatchFetch("https://api.vantanoir.store/auth", { headers: { "cf-access-jwt-assertion": await accessToken(email, audience, expiration) } });
      assert.equal((await response.json()).ok, expected, `Access JWT must validate email, audience and expiry: ${email}/${audience}/${expiration}`);
    }
    await rpc("sql", "INSERT INTO store_meta(key,value) VALUES('commerce_settings',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", JSON.stringify({supportEmail:"care@example.com",acceptingOrders:true,inventoryConfirmed:true,dispatchNote:"Test dispatch",deliveryNote:"Test delivery",returnPolicy:"Test return policy"}));
    const secondId = Object.values(product.colorways[1].variantIds)[0];
    const checkoutArgs = { customer, cart: [{ variantId: secondId, quantity: 1 }], expectedTotalKobo: product.priceKobo + 200000 };
    const started = await mf.dispatchFetch("https://api.vantanoir.store/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://vantanoir.store" }, body: JSON.stringify(checkoutArgs) });
    assert.equal(started.status, 200);
    const startedOrder = await started.json();
    await assert.rejects(rpc("updateOrderStatus", startedOrder.reference, "shipped"), /Payment must be confirmed/);
    await rpc("updateOrderStatus", startedOrder.reference, "cancelled");
    assert.equal((await rpc("sql", "SELECT COUNT(*) AS count FROM stock_reservations WHERE order_id IN (SELECT id FROM orders WHERE reference = ?)", startedOrder.reference)).results[0].count, 0, "Cancelling pending checkout releases reserved stock");
    await rpc("markOrderPaymentError", startedOrder.reference);
    assert.equal((await rpc("sql", "SELECT COUNT(*) AS count FROM stock_reservations WHERE order_id IN (SELECT id FROM orders WHERE reference = ?)", startedOrder.reference)).results[0].count, 0);
    await rpc("deleteAdminProduct", products[3].id);
    await rpc("ensureCatalogSeeded");
    assert.equal((await rpc("listCatalog")).length, products.length - 1, "Deleted catalogue products must not be resurrected by reads");
    const stored = await rpc("getGuestOrder", order.reference, "wrong@example.com", "");
    assert.equal(stored, null);

    await rpc("sql", "UPDATE product_variants SET stock = 1 WHERE id = ?", secondId);
    const lateArgs = { ...args, cart: [{ variantId: secondId, quantity: 1 }] };
    const late = await rpc("createPendingOrder", lateArgs);
    await rpc("sql", "UPDATE stock_reservations SET expires_at = datetime('now', '-1 minute') WHERE order_id = ?", late.id);
    const next = await rpc("createPendingOrder", lateArgs);
    await rpc("markOrderPaid", { reference: late.reference, amountKobo: late.totalKobo, eventKey: "late", eventType: "test" });
    assert.equal((await rpc("getOrderByReference", late.reference)).status, "paid_stock_review", "Late payment must not consume another shopper's reservation");
    await assert.rejects(rpc("updateOrderStatus", late.reference, "processing"), /stock is still unavailable/);
    await rpc("markOrderPaid", { reference: next.reference, amountKobo: next.totalKobo, eventKey: "next", eventType: "test" });
    await rpc("sql", "UPDATE product_variants SET stock = 2 WHERE id = ?", secondId);
    await Promise.allSettled([rpc("updateOrderStatus", late.reference, "processing"), rpc("updateOrderStatus", late.reference, "processing")]);
    assert.equal((await rpc("getOrderByReference", late.reference)).status, "processing");
    assert.equal((await rpc("sql", "SELECT stock FROM product_variants WHERE id = ?", secondId)).results[0].stock, 1, "Resolving stock review allocates once");
    await assert.rejects(rpc("updateOrderStatus", late.reference, "paid_stock_review"), /cannot move/);
    await rpc("updateOrderStatus", late.reference, "shipped");
    await rpc("updateOrderStatus", late.reference, "delivered");
    await assert.rejects(rpc("updateOrderStatus", late.reference, "processing"), /cannot move/);
    const adminOrder = (await rpc("listAdminOrders")).find(o => o.reference === late.reference);
    assert.equal(adminOrder.addressLine1, customer.addressLine1);
    assert.equal(adminOrder.items[0].quantity, 1);

    const editable = (await rpc("listAdminProducts")).find(p => p.id === product.id);
    const sizeGuide = { status: "reference", notes: "Fit checked in test", sections: [{ kind: "top", title: "Jacket", rows: ["S", "M", "L", "XL"].map((size, i) => ({ size, chest: 52 + i * 2, length: 68 + i * 2 })) }] };
    await rpc("saveAdminProduct", { ...editable, details: { ...editable.details, sizeGuide } });
    assert.deepEqual((await rpc("listCatalog")).find(p => p.id === product.id).details.sizeGuide, sizeGuide, "Edited measurement charts must persist through the database and public catalog");
    await assert.rejects(rpc("saveAdminProduct", { ...editable, details: { sizeGuide: { ...sizeGuide, sections: [{ ...sizeGuide.sections[0], rows: [{ size: "S", chest: -1 }] }] } } }), /greater than 0/);
    assert.equal((await rpc("listCatalog")).find(p => p.id === product.id).details.sizeGuide.sections[0].rows[0].chest, 52, "Invalid measurements must not overwrite the saved chart");
    await assert.rejects(rpc("saveAdminProduct", { ...editable, variants: editable.variants.map((v, i) => i ? v : { ...v, size: "<bad>" }) }), /valid size/);
    const customVariant={...editable.variants[0],id:undefined,sku:'VN-TEST-3XL',size:'XXXL',stock:3};
    await rpc("saveAdminProduct", {...editable,variants:[...editable.variants,customVariant],details:{...editable.details,sizeGuide:{...sizeGuide,sections:[{...sizeGuide.sections[0],rows:[...sizeGuide.sections[0].rows,{size:'3XL',chest:70,length:82}]}]}}});
    const customSizedProduct=(await rpc("listCatalog")).find(p=>p.id===product.id);
    assert.equal(customSizedProduct.colorways.find(c=>c.name===customVariant.color).stock['3XL'],3);
    assert.equal(customSizedProduct.details.sizeGuide.sections[0].rows.find(r=>r.size==='3XL').chest,70);
    assert.ok(customSizedProduct.colorways.find(c=>c.name===customVariant.color).variantIds['3XL']);
    await rpc("sql", "CREATE TRIGGER test_atomic_save BEFORE UPDATE ON product_variants BEGIN SELECT RAISE(ABORT, 'forced rollback'); END");
    await assert.rejects(rpc("saveAdminProduct", { ...editable, name: "Should roll back" }), /forced rollback/);
    await rpc("sql", "DROP TRIGGER test_atomic_save");
    assert.equal((await rpc("listAdminProducts")).find(p => p.id === product.id).name, editable.name, "Failed variant edits must roll back the product and its images");
  } finally { await mf.dispose(); }
});

test("existing catalog gains XXL once without changing existing stock or removed variations", async () => {
  await build({ entryPoints: ["tests/store-worker.ts"], outfile: "work/xxl-test-worker.mjs", bundle: true, format: "esm", platform: "neutral", target: "es2022", conditions: ["workerd", "browser"], external: ["cloudflare:workers"] });
  const mf = new Miniflare({ modules: true, scriptPath: "work/xxl-test-worker.mjs", compatibilityDate: "2026-05-15", compatibilityFlags: ["nodejs_compat"], d1Databases: ["DB"] });
  try {
    const db = await mf.getD1Database("DB");
    for (const file of (await readdir("drizzle")).filter(f => f.endsWith(".sql")).sort()) {
      const sql = (await readFile(`drizzle/${file}`, "utf8")).replaceAll("--> statement-breakpoint", "");
      await db.batch(sql.split(";").map(s => s.trim()).filter(Boolean).map(s => db.prepare(s)));
    }
    await db.batch([
      db.prepare("INSERT INTO store_meta (key,value) VALUES ('catalog_seeded','1')"),
      db.prepare("INSERT INTO products (id,slug,name,category,description,price_kobo,image_url,image_alt) VALUES ('vn-stealth','hoodie','Hoodie','Fleece','Test',10000,'/hoodie.webp','Hoodie')"),
      db.prepare("INSERT INTO product_variants (id,product_id,sku,size,color,color_hex,stock,active) VALUES ('black-s','vn-stealth','BLACK-S','S','Jet Black','#101112',7,1), ('black-xxl','vn-stealth','BLACK-XXL','XXL','Jet Black','#101112',3,1), ('grey-xl','vn-stealth','GREY-XL','XL','Charcoal Grey','#45484e',4,1), ('burgundy-s','vn-stealth','BURGUNDY-S','S','Dark Burgundy','#4a101b',2,1), ('burgundy-xxl','vn-stealth','BURGUNDY-XXL','XXL','Dark Burgundy','#4a101b',0,0)"),
    ]);
    const response = await mf.dispatchFetch("https://api.vantanoir.store/api/catalog");
    assert.equal(response.status, 200);
    const rows = (await db.prepare("SELECT color,size,stock,active FROM product_variants WHERE product_id='vn-stealth' ORDER BY color,size").all()).results;
    assert.equal(rows.filter(r => r.size === "XXL").length, 3);
    assert.equal(rows.find(r => r.color === "Jet Black" && r.size === "XXL").stock, 3);
    assert.equal(rows.find(r => r.color === "Charcoal Grey" && r.size === "XXL").stock, 0);
    assert.equal(rows.find(r => r.color === "Jet Black" && r.size === "S").stock, 7);
    assert.equal(rows.find(r => r.color === "Dark Burgundy" && r.size === "XXL").active, 0, "A previously removed XXL stays removed");
    await mf.dispatchFetch("https://api.vantanoir.store/api/catalog");
    assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM product_variants WHERE product_id='vn-stealth'").first()).count, 6);
  } finally { await mf.dispose(); }
});
