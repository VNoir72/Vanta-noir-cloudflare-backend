import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    detailsJson: text("details_json").notNull().default("{}"),
    priceKobo: integer("price_kobo").notNull(),
    imageUrl: text("image_url").notNull(),
    imageAlt: text("image_alt").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    status: text("status").notNull().default("published"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("products_slug_unique").on(table.slug),
    index("products_active_idx").on(table.active),
  ],
);

export const productVariants = sqliteTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    sku: text("sku").notNull(),
    size: text("size").notNull(),
    color: text("color").notNull().default("Onyx"),
    colorHex: text("color_hex").notNull().default("#101112"),
    stock: integer("stock").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("product_variants_sku_unique").on(table.sku),
    index("product_variants_product_idx").on(table.productId),
  ],
);

export const productImages = sqliteTable(
  "product_images",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    color: text("color").notNull().default(""),
    imageUrl: text("image_url").notNull(),
    imageAlt: text("image_alt").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("product_images_product_idx").on(table.productId),
    index("product_images_color_idx").on(table.productId, table.color),
  ],
);

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    reference: text("reference").notNull(),
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone").notNull(),
    addressLine1: text("address_line_1").notNull(),
    addressLine2: text("address_line_2").notNull().default(""),
    city: text("city").notNull(),
    state: text("state").notNull(),
    country: text("country").notNull().default("Nigeria"),
    subtotalKobo: integer("subtotal_kobo").notNull(),
    shippingKobo: integer("shipping_kobo").notNull().default(0),
    totalKobo: integer("total_kobo").notNull(),
    discountKobo: integer("discount_kobo").notNull().default(0),
    promotionCode: text("promotion_code").notNull().default(""),
    status: text("status").notNull().default("pending_payment"),
    paymentStatus: text("payment_status").notNull().default("pending"),
    paidAt: text("paid_at"),
    allocationToken: text("allocation_token"),
    carrier: text("carrier").notNull().default(""),
    trackingNumber: text("tracking_number").notNull().default(""),
    trackingUrl: text("tracking_url").notNull().default(""),
    deliveryEstimate: text("delivery_estimate").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("orders_reference_unique").on(table.reference),
    index("orders_created_idx").on(table.createdAt),
    index("orders_payment_status_idx").on(table.paymentStatus),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    productId: text("product_id").notNull(),
    variantId: text("variant_id").notNull(),
    productName: text("product_name").notNull(),
    size: text("size").notNull(),
    color: text("color").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceKobo: integer("unit_price_kobo").notNull(),
    lineTotalKobo: integer("line_total_kobo").notNull(),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

export const paymentEvents = sqliteTable(
  "payment_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventKey: text("event_key").notNull(),
    reference: text("reference").notNull(),
    eventType: text("event_type").notNull(),
    processedAt: text("processed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("payment_events_key_unique").on(table.eventKey),
    index("payment_events_reference_idx").on(table.reference),
  ],
);

export const storeMeta = sqliteTable("store_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const stockReservations = sqliteTable("stock_reservations", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id),
  variantId: text("variant_id").notNull().references(() => productVariants.id),
  quantity: integer("quantity").notNull(),
  expiresAt: text("expires_at").notNull(),
}, table => [
  index("stock_reservations_variant_expiry_idx").on(table.variantId, table.expiresAt),
  index("stock_reservations_order_idx").on(table.orderId),
]);

export const subscribers = sqliteTable("subscribers", {
  id: text("id").primaryKey(), email: text("email").notNull(),
  kind: text("kind").notNull(), variantId: text("variant_id").notNull().default(""),
  status: text("status").notNull().default("active"), token: text("token").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("subscribers_email_kind_variant_idx").on(table.email, table.kind, table.variantId), uniqueIndex("subscribers_token_idx").on(table.token)]);

export const productReviews = sqliteTable("product_reviews", {
  id: text("id").primaryKey(), productId: text("product_id").notNull(),
  orderId: text("order_id").notNull().references(() => orders.id),
  displayName: text("display_name").notNull(), rating: integer("rating").notNull(),
  fit: text("fit").notNull().default("true_to_size"), body: text("body").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("reviews_order_product_idx").on(table.orderId, table.productId), index("reviews_product_status_idx").on(table.productId, table.status)]);

export const returnRequests = sqliteTable("return_requests", {
  id: text("id").primaryKey(), orderId: text("order_id").notNull().references(() => orders.id),
  version: integer("version").notNull().default(0),
  kind: text("kind").notNull(), reason: text("reason").notNull(), itemsJson: text("items_json").notNull(),
  status: text("status").notNull().default("requested"), notes: text("notes").notNull().default(""),
  refundKobo: integer("refund_kobo").notNull().default(0), refundReference: text("refund_reference").notNull().default(""),
  refundStatus: text("refund_status").notNull().default("none"), restocked: integer("restocked").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("returns_order_idx").on(table.orderId), index("returns_status_created_idx").on(table.status, table.createdAt)]);

export const emailOutbox = sqliteTable("email_outbox", {
  id: text("id").primaryKey(), eventKey: text("event_key").notNull(),
  recipient: text("recipient").notNull(), subject: text("subject").notNull(), body: text("body").notNull(),
  status: text("status").notNull().default("pending"), attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: text("next_attempt_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lockedAt: text("locked_at"), lastError: text("last_error").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), sentAt: text("sent_at"),
}, table => [uniqueIndex("email_outbox_event_idx").on(table.eventKey), index("email_outbox_pending_idx").on(table.status, table.nextAttemptAt)]);

export const stockAdjustments = sqliteTable("stock_adjustments", {
  id: integer("id").primaryKey({ autoIncrement: true }), variantId: text("variant_id").notNull(),
  oldStock: integer("old_stock").notNull(), newStock: integer("new_stock").notNull(),
  reason: text("reason").notNull(), actor: text("actor").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("stock_adjustments_variant_created_idx").on(table.variantId, table.createdAt)]);

export const requestLimits = sqliteTable("request_limits", {
  key: text("key").primaryKey(), hits: integer("hits").notNull().default(0), expiresAt: integer("expires_at").notNull(),
});

export const adminStaff = sqliteTable("admin_staff", {
  email: text("email").primaryKey(), role: text("role").notNull(),
  active: integer("active").notNull().default(1), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const adminAudit = sqliteTable("admin_audit", {
  id: integer("id").primaryKey({autoIncrement:true}), actor: text("actor").notNull(),
  action: text("action").notNull(), entity: text("entity").notNull(), detail: text("detail").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, t=>[index("admin_audit_created_idx").on(t.createdAt)]);
export const promotions = sqliteTable("promotions", {
  code:text("code").primaryKey(), title:text("title").notNull(), kind:text("kind").notNull(),
  value:integer("value").notNull(), minimumKobo:integer("minimum_kobo").notNull().default(0),
  minimumQuantity:integer("minimum_quantity").notNull().default(1), productIds:text("product_ids").notNull().default("[]"),
  maxUses:integer("max_uses").notNull().default(0), startsAt:text("starts_at").notNull(), endsAt:text("ends_at").notNull(),
  active:integer("active").notNull().default(0), version:integer("version").notNull().default(1),
});
export const exchanges = sqliteTable("exchanges", {
  returnId:text("return_id").primaryKey().references(()=>returnRequests.id),
  itemsJson:text("items_json").notNull(), status:text("status").notNull().default("allocated"),
  trackingNumber:text("tracking_number").notNull().default(""), carrier:text("carrier").notNull().default(""),
  actor:text("actor").notNull(), createdAt:text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const courierEvents = sqliteTable("courier_events", {
  id:text("id").primaryKey(), reference:text("reference").notNull(), status:text("status").notNull(),
  createdAt:text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
