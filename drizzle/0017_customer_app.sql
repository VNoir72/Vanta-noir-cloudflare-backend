CREATE TABLE IF NOT EXISTS app_customers (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL DEFAULT '',
 addresses_json TEXT NOT NULL DEFAULT '[]', favourites_json TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL, terms_version TEXT NOT NULL DEFAULT 'app-v1', terms_accepted_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS app_login_challenges (
 id TEXT PRIMARY KEY, email TEXT NOT NULL, digest TEXT NOT NULL, expires_at INTEGER NOT NULL, purpose TEXT NOT NULL DEFAULT 'signin',
 attempts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS app_sessions (
 digest TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES app_customers(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS app_sessions_customer ON app_sessions(customer_id);
CREATE TABLE IF NOT EXISTS app_customer_orders (
 customer_id TEXT NOT NULL REFERENCES app_customers(id) ON DELETE CASCADE,
 reference TEXT NOT NULL UNIQUE, PRIMARY KEY (customer_id,reference)
);
