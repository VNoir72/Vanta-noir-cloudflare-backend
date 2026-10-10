CREATE TABLE IF NOT EXISTS product_interest (
 visitor_id TEXT NOT NULL,
 product_id TEXT NOT NULL REFERENCES products(id),
 color TEXT NOT NULL,
 size TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(visitor_id,product_id,color)
);
CREATE INDEX IF NOT EXISTS product_interest_product ON product_interest(product_id,updated_at);
