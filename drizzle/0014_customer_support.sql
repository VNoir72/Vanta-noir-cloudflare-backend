ALTER TABLE support_tickets ADD COLUMN public_reference TEXT NOT NULL DEFAULT '';
ALTER TABLE support_tickets ADD COLUMN source TEXT NOT NULL DEFAULT 'staff';
CREATE UNIQUE INDEX support_public_reference ON support_tickets(public_reference) WHERE public_reference<>'';
CREATE TABLE support_reads (ticket_id TEXT NOT NULL REFERENCES support_tickets(id), viewer TEXT NOT NULL, version INTEGER NOT NULL, PRIMARY KEY(ticket_id,viewer));
CREATE INDEX support_assigned_status ON support_tickets(assigned_to,status);
