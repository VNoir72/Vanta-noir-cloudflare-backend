CREATE TABLE IF NOT EXISTS automation_rules (
 id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1, config_json TEXT NOT NULL DEFAULT '{}',
 version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS automation_runs (
 id TEXT PRIMARY KEY, rule_id TEXT NOT NULL, status TEXT NOT NULL, started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 finished_at TEXT, result_json TEXT NOT NULL DEFAULT '{}', error TEXT NOT NULL DEFAULT '',
 actor TEXT NOT NULL, lease_until INTEGER NOT NULL, retry_of TEXT
);
CREATE INDEX IF NOT EXISTS automation_runs_rule ON automation_runs(rule_id,started_at);
CREATE UNIQUE INDEX IF NOT EXISTS automation_rule_running ON automation_runs(rule_id) WHERE status='running';
CREATE TABLE IF NOT EXISTS crm_profiles (
 email TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', tags_json TEXT NOT NULL DEFAULT '[]',
 preferences TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS crm_notes (
 id TEXT PRIMARY KEY, email TEXT NOT NULL, author TEXT NOT NULL, body TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS crm_notes_email ON crm_notes(email,created_at);
CREATE TABLE IF NOT EXISTS automation_drops (
 id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id), publish_at TEXT NOT NULL,
 announce INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'scheduled',
 version INTEGER NOT NULL DEFAULT 1, created_by TEXT NOT NULL, error TEXT NOT NULL DEFAULT '',
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS automation_drops_due ON automation_drops(status,publish_at);
CREATE UNIQUE INDEX IF NOT EXISTS automation_drop_active ON automation_drops(product_id) WHERE status='scheduled';
CREATE TABLE IF NOT EXISTS automation_delivery (
 order_id TEXT PRIMARY KEY REFERENCES orders(id), delivered_at TEXT NOT NULL
);
INSERT OR IGNORE INTO store_meta(key,value) VALUES('automation-delivery-start',CURRENT_TIMESTAMP);
