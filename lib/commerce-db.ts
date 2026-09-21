import { z } from "zod";
import { renderEmailHtml } from "./email-template";
import { getDbBinding, runtimeEnv } from "./runtime-env";
import { commerceSettingsSchema, defaultCommerceSettings, type CommerceSettings } from "./commerce-config";
import { formatNaira } from "./catalog";
import { SITE_URL } from "./seo";

export async function getCommerceSettings(): Promise<CommerceSettings> {
  const row=await getDbBinding().prepare("SELECT value FROM store_meta WHERE key = 'commerce_settings'").first<{value:string}>();
  if(!row)return defaultCommerceSettings();
  return commerceSettingsSchema.parse(JSON.parse(row.value));
}
export async function saveCommerceSettings(value: unknown) {
  const settings=commerceSettingsSchema.parse(value);
  await getDbBinding().prepare("INSERT INTO store_meta (key,value) VALUES ('commerce_settings',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(settings)).run();
  return settings;
}
export async function rateLimit(request: Request, scope: string, maximum=20, seconds=600) {
  const address=request.headers.get("cf-connecting-ip") || "local";
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`${scope}:${address}`));
  const key=Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,"0")).join("");
  const now=Math.floor(Date.now()/1000); const db=getDbBinding();
  const row=await db.prepare(`INSERT INTO request_limits (key,hits,expires_at) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN expires_at < ? THEN 1 ELSE hits+1 END,
    expires_at=CASE WHEN expires_at < ? THEN excluded.expires_at ELSE expires_at END RETURNING hits`)
    .bind(key,now+seconds,now,now).first<{hits:number}>();
  return Boolean(row && row.hits<=maximum);
}
export function emailReady(){const env=runtimeEnv();return Boolean(env.RESEND_API_KEY?.trim() && env.EMAIL_FROM?.trim());}
export async function queueEmail(eventKey:string,recipient:string,subject:string,body:string){
  await getDbBinding().prepare("INSERT OR IGNORE INTO email_outbox (id,event_key,recipient,subject,body) VALUES (?,?,?,?,?)")
    .bind(crypto.randomUUID(),eventKey,recipient,subject,body).run();
}
export async function queueOrderEmail(reference:string,event:string){
  const db=getDbBinding();
  const order=await db.prepare(`SELECT id,email,first_name AS firstName,last_name AS lastName,total_kobo AS totalKobo,
    subtotal_kobo AS subtotalKobo,shipping_kobo AS shippingKobo,discount_kobo AS discountKobo,status,payment_status AS paymentStatus,
    address_line_1 AS addressLine1,address_line_2 AS addressLine2,city,state,country,
    carrier,tracking_number AS trackingNumber,tracking_url AS trackingUrl,delivery_estimate AS deliveryEstimate FROM orders WHERE reference=?`).bind(reference)
    .first<{id:string;email:string;firstName:string;lastName:string;totalKobo:number;subtotalKobo:number;shippingKobo:number;discountKobo:number;status:string;paymentStatus:string;addressLine1:string;addressLine2:string;city:string;state:string;country:string;carrier:string;trackingNumber:string;trackingUrl:string;deliveryEstimate:string}>();
  if(!order || (event === "payment" && order.paymentStatus !== "paid"))return;
  const items=await db.prepare("SELECT product_name AS name,color,size,quantity,line_total_kobo AS lineTotalKobo FROM order_items WHERE order_id=? ORDER BY id").bind(order.id).all<{name:string;color:string;size:string;quantity:number;lineTotalKobo:number}>();
  const subject=event === "payment" ? "Order confirmation — payment received" : event.startsWith("tracking") ? "Your tracking details" : `Order ${order.status.replaceAll("_"," ")}`;
  const stockNote=order.status === "paid_stock_review" ? "Your payment is confirmed. We are checking stock and will contact you before dispatch." : event === "payment" ? "Thank you for shopping with Vanta Noir. Your payment has been verified. We will send another update when your order is dispatched." : `Order status: ${order.status.replaceAll("_"," ")}.`;
  const settings=await getCommerceSettings();
  const body=`Hi ${order.firstName},\n\n${subject} for ${reference}.\n${stockNote}\n\nYOUR ITEMS\n${items.results.map(i=>`${i.quantity} × ${i.name} · ${i.color} · ${i.size} — ${formatNaira(i.lineTotalKobo)}`).join("\n")}\n\nSubtotal: ${formatNaira(order.subtotalKobo)}\nDelivery: ${formatNaira(order.shippingKobo)}\n${order.discountKobo ? `Discount: −${formatNaira(order.discountKobo)}\n` : ""}Total: ${formatNaira(order.totalKobo)}\n\nDELIVERY ADDRESS\n${[`${order.firstName} ${order.lastName}`,order.addressLine1,order.addressLine2,order.city,order.state,order.country].filter(Boolean).join("\n")}\n${order.deliveryEstimate ? `\nDelivery estimate: ${order.deliveryEstimate}\n` : ""}${order.carrier ? `\nCourier: ${order.carrier}\nTracking: ${order.trackingNumber}\n${order.trackingUrl}\n` : ""}\nTrack your order or request a return: ${runtimeEnv().STOREFRONT_URL || SITE_URL}/help-center#track-order\nUse your order reference and the email or phone used at checkout.\n\nQuestions? ${settings.supportEmail || `${runtimeEnv().STOREFRONT_URL || SITE_URL}/contact`}\nVanta Noir\nPresence. Power. Precision.`;
  await queueEmail(`order:${reference}:${event}`,order.email,`${subject} · ${reference}`,body);
}

export async function processEmailOutbox(limit=10){
  if(!emailReady())return {sent:0,configured:false};
  const db=getDbBinding(),env=runtimeEnv(); let sent=0;
  await db.prepare("UPDATE email_outbox SET status='pending' WHERE status='sending' AND locked_at < datetime('now','-5 minutes')").run();
  // Provider idempotency keys expire after 24 hours. Ambiguous older attempts require a manual delivery check.
  await db.prepare("UPDATE email_outbox SET status='review',last_error='Check provider delivery before resending; retry window expired.' WHERE status='pending' AND attempts>0 AND created_at < datetime('now','-23 hours')").run();
  const rows=await db.prepare("SELECT id FROM email_outbox WHERE status='pending' AND attempts<8 AND next_attempt_at<=CURRENT_TIMESTAMP ORDER BY created_at LIMIT ?").bind(limit).all<{id:string}>();
  for(const candidate of rows.results){
    const row=await db.prepare("UPDATE email_outbox SET status='sending',locked_at=CURRENT_TIMESTAMP,attempts=attempts+1 WHERE id=? AND status='pending' RETURNING id,recipient,subject,body,attempts,event_key AS eventKey")
      .bind(candidate.id).first<{id:string;recipient:string;subject:string;body:string;attempts:number;eventKey:string}>();
    if(!row)continue;
    // A queued marketing or restock email must respect an unsubscribe that happened after it was queued.
    if(row.eventKey.startsWith("subscription:")){
      const subscriptionId=row.eventKey.split(":")[1];
      const subscriber=await db.prepare("SELECT status,token FROM subscribers WHERE id=?").bind(subscriptionId).first<{status:string;token:string}>();
      if(!subscriber || subscriber.status === "unsubscribed" || !row.eventKey.endsWith(subscriber.token)){await db.prepare("UPDATE email_outbox SET status='cancelled' WHERE id=?").bind(row.id).run();continue;}
    }
    try {
      const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":row.id},body:JSON.stringify({from:env.EMAIL_FROM,to:[row.recipient],subject:row.subject,text:row.body,html:renderEmailHtml(row.subject,row.body),...(env.EMAIL_REPLY_TO ? {reply_to:env.EMAIL_REPLY_TO} : {})}),signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw new Error(`Email service returned ${response.status}.`);
      await db.prepare("UPDATE email_outbox SET status='sent',sent_at=CURRENT_TIMESTAMP,last_error='' WHERE id=?").bind(row.id).run();sent++;
    }catch(error){await db.prepare("UPDATE email_outbox SET status=?,last_error=?,next_attempt_at=datetime('now',?) WHERE id=?")
      .bind(row.attempts>=8 ? "review" : "pending",error instanceof Error ? error.message : "Email service unavailable.",`+${Math.min(60,2**row.attempts)} minutes`,row.id).run();}
  }
  return {sent,configured:true};
}

export const subscriptionSchema=z.object({email:z.string().trim().toLowerCase().email().max(200),kind:z.enum(["newsletter","restock"]),variantId:z.string().trim().max(160).default(""),consent:z.literal(true)});
export async function subscribe(input:z.infer<typeof subscriptionSchema>){
  const db=getDbBinding();
  if(input.kind === "restock"){
    const item=await db.prepare("SELECT v.id FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id=? AND v.active=1 AND p.status='published'").bind(input.variantId).first();
    if(!item)throw new Error("This size is no longer available for restock alerts.");
  }
  const variantId=input.kind === "restock" ? input.variantId : "";
  const existing=await db.prepare("SELECT id,status,token FROM subscribers WHERE email=? AND kind=? AND variant_id=?").bind(input.email,input.kind,variantId).first<{id:string;status:string;token:string}>();
  if(existing?.status === "active" || existing?.status === "pending")return;
  const id=existing?.id ?? crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID();
  await db.batch([
    db.prepare("INSERT INTO subscribers (id,email,kind,variant_id,token,status) VALUES (?,?,?,?,?,'pending') ON CONFLICT(email,kind,variant_id) DO UPDATE SET token=excluded.token,status='pending',updated_at=CURRENT_TIMESTAMP WHERE subscribers.status NOT IN ('active','pending')").bind(id,input.email,input.kind,variantId,token),
    db.prepare("INSERT OR IGNORE INTO email_outbox (id,event_key,recipient,subject,body) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM subscribers WHERE id=? AND token=?)")
      .bind(crypto.randomUUID(),`subscription:${id}:confirm:${token}`,input.email,"Confirm your email · Vanta Noir",`Please confirm that you requested ${input.kind === "restock" ? "a restock alert" : "Vanta Noir collection news"}.\n\nConfirm: ${runtimeEnv().STOREFRONT_URL || SITE_URL}/email-preferences?token=${token}&action=confirm\n\nIf you did not request this, you can ignore this email.\nVanta Noir`,id,token),
  ]);
}
export async function confirmSubscription(token:string){
  const result=await getDbBinding().prepare("UPDATE subscribers SET status='active',updated_at=CURRENT_TIMESTAMP WHERE token=? AND status IN ('pending','active')").bind(token).run();
  return Boolean(result.meta.changes);
}

export async function unsubscribe(token:string){
  const result=await getDbBinding().prepare("UPDATE subscribers SET status='unsubscribed',updated_at=CURRENT_TIMESTAMP WHERE token=?").bind(token).run();
  return Boolean(result.meta.changes);
}
export async function queueRestockAlerts(){
  const db=getDbBinding();
  const rows=await db.prepare(`SELECT s.id,s.email,s.token,p.slug,p.name,v.size,v.color FROM subscribers s
    JOIN product_variants v ON v.id=s.variant_id JOIN products p ON p.id=v.product_id
    WHERE s.kind='restock' AND s.status='active' AND v.active=1 AND p.active=1 AND p.status='published'
      AND v.stock-COALESCE((SELECT SUM(quantity) FROM stock_reservations WHERE variant_id=v.id AND expires_at>CURRENT_TIMESTAMP),0)>0 LIMIT 50`)
    .all<{id:string;email:string;token:string;slug:string;name:string;size:string;color:string}>();
  for(const row of rows.results){
    const url=runtimeEnv().STOREFRONT_URL || SITE_URL;
    await queueEmail(`subscription:${row.id}:restock:${row.token}`,row.email,`${row.name} is back · Vanta Noir`,`${row.name} · ${row.color} · ${row.size} is available again.\n\nShop: ${url}/products/${row.slug}\nStock is not reserved and may change.\n\nUnsubscribe: ${url}/email-preferences?token=${row.token}`);
    await db.prepare("UPDATE subscribers SET status='notified',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='active'").bind(row.id).run();
  }
}
export async function queueLowStockAlerts(){
  const email=runtimeEnv().ADMIN_EMAIL;if(!email)return;
  const settings=await getCommerceSettings(),db=getDbBinding();
  const rows=await db.prepare("SELECT p.name,v.sku,v.stock FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.active=1 AND p.status='published' AND v.stock<=? ORDER BY v.stock,v.sku LIMIT 100").bind(settings.lowStockThreshold).all<{name:string;sku:string;stock:number}>();
  if(rows.results.length)await queueEmail(`low-stock:${new Date().toISOString().slice(0,10)}`,email,"Low stock · Vanta Noir",`${rows.results.length} variations are at or below ${settings.lowStockThreshold} units.\n\n${rows.results.map(v=>`${v.name} · ${v.sku}: ${v.stock}`).join("\n")}\n\nOpen Store admin to update inventory.`);
}
export async function runCommerceMaintenance(){
  await queueRestockAlerts(); await queueLowStockAlerts();
  await getDbBinding().prepare("DELETE FROM request_limits WHERE expires_at < ?").bind(Math.floor(Date.now()/1000)-86400).run();
  return processEmailOutbox();
}

export const reviewSchema=z.object({productId:z.string().trim().min(1).max(160),reference:z.string().trim().min(3).max(120),email:z.string().trim().email().max(200),displayName:z.string().trim().min(2).max(60),rating:z.number().int().min(1).max(5),fit:z.enum(["small","true_to_size","large"]),body:z.string().trim().min(10).max(2000)});
export async function submitReview(input:z.infer<typeof reviewSchema>){
  const db=getDbBinding();
  const order=await db.prepare(`SELECT o.id FROM orders o JOIN order_items oi ON oi.order_id=o.id WHERE o.reference=? AND lower(o.email)=lower(?) AND o.payment_status='paid' AND o.status='delivered' AND oi.product_id=? LIMIT 1`).bind(input.reference,input.email,input.productId).first<{id:string}>();
  if(!order)throw new Error("Use the reference and email for a delivered order containing this product.");
  const result=await db.prepare("INSERT OR IGNORE INTO product_reviews (id,product_id,order_id,display_name,rating,fit,body) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),input.productId,order.id,input.displayName,input.rating,input.fit,input.body).run();
  if(!result.meta.changes)throw new Error("You have already submitted a review for this product and order.");
}
export async function listReviews(productId:string,page=1){
  const rows=await getDbBinding().prepare(`SELECT r.id,r.display_name AS displayName,r.rating,r.fit,r.body,r.created_at AS createdAt,p.name AS productName
    FROM product_reviews r JOIN products p ON p.id=r.product_id WHERE r.status='published' AND p.status='published' AND (?='' OR r.product_id=?) ORDER BY r.created_at DESC,r.id DESC LIMIT 11 OFFSET ?`).bind(productId,productId,(page-1)*10).all();
  return {reviews:rows.results.slice(0,10),hasMore:rows.results.length>10};
}

export const returnSchema=z.object({reference:z.string().trim().min(3).max(120),email:z.string().trim().email().max(200),kind:z.enum(["return","exchange"]),reason:z.string().trim().min(10).max(2000),items:z.array(z.object({id:z.number().int().positive(),quantity:z.number().int().min(1).max(5)})).min(1).max(20).refine(items=>new Set(items.map(i=>i.id)).size===items.length)});
export async function requestReturn(input:z.infer<typeof returnSchema>){
  const db=getDbBinding();
  const order=await db.prepare("SELECT id,email FROM orders WHERE reference=? AND lower(email)=lower(?) AND payment_status='paid' AND status IN ('shipped','delivered')").bind(input.reference,input.email).first<{id:string;email:string}>();
  if(!order)throw new Error("Check your order reference and email. Returns are available after dispatch.");
  const purchased=await db.prepare("SELECT id,variant_id AS variantId,quantity,product_name AS name,color,size FROM order_items WHERE order_id=?").bind(order.id).all<{id:number;variantId:string;quantity:number;name:string;color:string;size:string}>();
  const selected=input.items.map(item=>{const original=purchased.results.find(p=>p.id===item.id);if(!original || item.quantity>original.quantity)throw new Error("Check the items and quantities for this return.");return {...original,quantity:item.quantity};});
  const id=crypto.randomUUID();
  const results=await db.batch([
    db.prepare("INSERT OR IGNORE INTO return_requests (id,order_id,kind,reason,items_json) VALUES (?,?,?,?,?)").bind(id,order.id,input.kind,input.reason,JSON.stringify(selected)),
    db.prepare("INSERT OR IGNORE INTO email_outbox (id,event_key,recipient,subject,body) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM return_requests WHERE id=?)")
      .bind(crypto.randomUUID(),`return:${id}:requested`,order.email,`Request received · ${input.reference}`,`We received your ${input.kind} request for ${input.reference}.\n\nWait for customer care to approve it and send return instructions before posting any items.\n\nTrack your request: ${runtimeEnv().STOREFRONT_URL || SITE_URL}/help-center#track-order`,id),
  ]);
  if(!results[0].meta.changes)throw new Error("This order already has a return or exchange request. Track the existing request or contact care to change it.");
  return {id};
}
export const returnUpdateSchema=z.object({version:z.number().int().min(0),id:z.string().max(100),status:z.enum(["requested","approved","received","resolved","declined"]),notes:z.string().trim().max(2000).default(""),refundKobo:z.number().int().min(0).max(100000000000).default(0),refundReference:z.string().trim().max(160).default(""),refundStatus:z.enum(["none","pending","completed"]).default("none"),restock:z.boolean().default(false)});
export async function updateReturn(input:z.infer<typeof returnUpdateSchema>,actor:string){
  const db=getDbBinding();
  const row=await db.prepare("SELECT r.*,o.reference,o.email,o.total_kobo AS totalKobo,o.subtotal_kobo AS subtotalKobo,o.discount_kobo AS discountKobo FROM return_requests r JOIN orders o ON o.id=r.order_id WHERE r.id=?").bind(input.id).first<{id:string;status:string;items_json:string;restocked:number;reference:string;email:string;totalKobo:number;subtotalKobo:number;discountKobo:number;updated_at:string;version:number}>();
  if(!row)throw new Error("Return request not found.");
  if(row.version!==input.version)throw new Error("This request changed. Refresh before saving.");
  const allowed:Record<string,string[]>={requested:["requested","approved","declined"],approved:["approved","received","declined"],received:["received","resolved"],resolved:["resolved"],declined:["declined"]};
  if(!allowed[row.status]?.includes(input.status))throw new Error("Move this request through approval and receipt before resolving it.");
  const returnedItems=JSON.parse(row.items_json) as Array<{id:number;quantity:number}>;
  const purchased=(await db.prepare('SELECT id,unit_price_kobo FROM order_items WHERE order_id=(SELECT order_id FROM return_requests WHERE id=?)').bind(input.id).all<{id:number;unit_price_kobo:number}>()).results;
  const returnedGross=returnedItems.reduce((sum,i)=>sum+(purchased.find(p=>p.id===i.id)?.unit_price_kobo||0)*i.quantity,0);
  const refundLimit=Math.floor(returnedGross*(row.subtotalKobo-row.discountKobo)/Math.max(1,row.subtotalKobo));
  if(input.refundKobo>refundLimit)throw new Error("Refund cannot exceed the returned items’ value after discounts (delivery excluded).");
  if(input.refundStatus==="completed" && (!input.refundReference || !input.refundKobo))throw new Error("Record the Paystack refund reference and amount after processing the refund.");
  if(input.restock && (row.restocked || !["received","resolved"].includes(input.status)))throw new Error("Only inspected, received items can be restocked once.");
  const statements=[]; const token=crypto.randomUUID();
  // The version claim gates every statement in this atomic mutation.
  const lockKey=`return-update:${input.id}`;
  statements.push(db.prepare("INSERT INTO store_meta (key,value) SELECT ?,? WHERE EXISTS (SELECT 1 FROM return_requests WHERE id=? AND version=?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(lockKey,token,input.id,input.version));
  if(input.restock){
    const items=JSON.parse(row.items_json) as Array<{variantId:string;quantity:number}>;
    for(const item of items){
      statements.push(db.prepare("INSERT INTO stock_adjustments (variant_id,old_stock,new_stock,reason,actor) SELECT id,stock,stock+?, ?, ? FROM product_variants WHERE id=? AND EXISTS (SELECT 1 FROM return_requests WHERE id=? AND restocked=0) AND EXISTS (SELECT 1 FROM store_meta WHERE key=? AND value=?)").bind(item.quantity,`Return ${input.id}`,actor,item.variantId,input.id,lockKey,token));
      statements.push(db.prepare("UPDATE product_variants SET stock=stock+?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND EXISTS (SELECT 1 FROM return_requests WHERE id=? AND restocked=0) AND EXISTS (SELECT 1 FROM store_meta WHERE key=? AND value=?)").bind(item.quantity,item.variantId,input.id,lockKey,token));
    }
  }
  statements.push(db.prepare("UPDATE return_requests SET status=?,notes=?,refund_kobo=?,refund_reference=?,refund_status=?,restocked=CASE WHEN ?=1 THEN 1 ELSE restocked END,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND EXISTS (SELECT 1 FROM store_meta WHERE key=? AND value=?)")
    .bind(input.status,input.notes,input.refundKobo,input.refundReference,input.refundStatus,input.restock?1:0,input.id,lockKey,token));
  statements.push(db.prepare("INSERT OR IGNORE INTO email_outbox (id,event_key,recipient,subject,body) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM store_meta WHERE key=? AND value=?)")
    .bind(crypto.randomUUID(),`return:${input.id}:version:${input.version+1}`,row.email,`Return update · ${row.reference}`,`Your ${row.reference} return request is ${input.status}.\n${input.notes}\n${input.refundStatus !== "none" ? `Refund: ${input.refundStatus} · ${formatNaira(input.refundKobo)}\nReference: ${input.refundReference}` : ""}\n\nTrack your request: ${runtimeEnv().STOREFRONT_URL || SITE_URL}/help-center#track-order`,lockKey,token));
  statements.push(db.prepare("DELETE FROM store_meta WHERE key=? AND value=?").bind(lockKey,token));
  const result=await db.batch(statements);
  if(!result[0].meta.changes)throw new Error("This request changed. Refresh before saving.");
}
