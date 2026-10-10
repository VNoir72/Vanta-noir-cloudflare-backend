CREATE TABLE IF NOT EXISTS app_customer_cards (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES app_customers(id) ON DELETE CASCADE,
  signature TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('test','live')),
  authorization_cipher TEXT NOT NULL,
  email TEXT NOT NULL,
  brand TEXT NOT NULL,
  last4 TEXT NOT NULL,
  expiry_month INTEGER NOT NULL,
  expiry_year INTEGER NOT NULL,
  consent_at INTEGER NOT NULL,
  UNIQUE(customer_id, mode, signature)
);
CREATE INDEX IF NOT EXISTS app_customer_cards_owner ON app_customer_cards(customer_id);
