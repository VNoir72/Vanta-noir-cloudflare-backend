CREATE TABLE IF NOT EXISTS walk_in_sales (
 order_id TEXT PRIMARY KEY REFERENCES orders(id),
 actor TEXT NOT NULL,
 client_id TEXT NOT NULL,
 request_json TEXT NOT NULL,
 payment_method TEXT NOT NULL,
 payment_reference TEXT NOT NULL DEFAULT '',
 customer TEXT NOT NULL DEFAULT '',
 approval_id TEXT NOT NULL UNIQUE,
 UNIQUE(actor,client_id)
);
