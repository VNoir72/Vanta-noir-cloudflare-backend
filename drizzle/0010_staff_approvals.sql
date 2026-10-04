CREATE TABLE IF NOT EXISTS admin_approvals (
 id TEXT PRIMARY KEY NOT NULL,
 actor TEXT NOT NULL,
 role TEXT NOT NULL,
 action TEXT NOT NULL,
 request_hash TEXT NOT NULL,
 payload_json TEXT NOT NULL,
 baseline_json TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','applying','approved','rejected','conflict','review')),
 reviewer TEXT NOT NULL DEFAULT '',
 review_note TEXT NOT NULL DEFAULT '',
 result_json TEXT NOT NULL DEFAULT 'null',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS admin_approvals_status_date ON admin_approvals(status,created_at);
CREATE INDEX IF NOT EXISTS admin_approvals_actor_date ON admin_approvals(actor,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS admin_approvals_pending_unique ON admin_approvals(actor,request_hash) WHERE status IN ('pending','applying');
