CREATE TABLE IF NOT EXISTS support_tickets (
 id TEXT PRIMARY KEY NOT NULL,
 subject TEXT NOT NULL,
 customer_name TEXT NOT NULL,
 contact TEXT NOT NULL DEFAULT '',
 channel TEXT NOT NULL,
 order_reference TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL,
 priority TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open',
 assigned_to TEXT NOT NULL DEFAULT '',
 created_by TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS support_status_updated ON support_tickets(status,updated_at);
CREATE TABLE IF NOT EXISTS support_notes (
 id TEXT PRIMARY KEY NOT NULL,
 ticket_id TEXT NOT NULL REFERENCES support_tickets(id),
 author TEXT NOT NULL,
 body TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS support_notes_ticket ON support_notes(ticket_id,created_at);
