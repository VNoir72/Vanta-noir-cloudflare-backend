# Customer care, order lookup and workspace guides

Contact submissions go to POST /api/support and enter the private Support enquiry log immediately. Social links on Contact are for brand updates. Each enquiry gets a random VN-HELP reference and an idempotent request UUID. Receipt emails and alerts for active support staff plus the owner are inserted atomically in the existing outbox; the existing maintenance runner delivers them. Revoked staff alerts are cancelled before delivery. Customer-reported urgent issues remain visible until resolved.

The form enforces field/size limits, a honeypot and per-address plus per-email hourly limits. It exposes only the new enquiry reference, never order data. Submitted order references are unverified claims. Customer care confirms identity before disclosing information. Staff edits still require owner approval; per-user read receipts only acknowledge information viewed.

Support and owner alert counts refresh once a minute while visible. Order lookup searches name, email, phone, order or tracking reference, with literal wildcard escaping and pagination. It shows stored order/payment/delivery fields, items, related returns/exchanges/enquiries and visible pending changes. Support staff see only their own pending changes. Tracking is the latest stored information, not an assertion of live courier polling.

Sales, Support and Admin have searchable help guides. Support includes triage, identity checks, delivery/payment issues, returns, escalation and reply templates. Notes remain internal; this release does not send staff-authored customer replies from the dashboard. Published policy links remain authoritative.

Migration: apply ONLY drizzle/0014_customer_support.sql and record it in d1_migrations. It adds support source/reference fields and private read receipts. Do not reapply historical migrations or import catalogue data.

Deployment: backend can deploy independently; the customer form needs the updated Namecheap storefront. Package using scripts/package-namecheap.py --repair-code to include current pages/assets/config while retaining existing garment images. Extract into the domain's active public_html with overwrite. No image removals or catalogue changes are part of this release.

Validation: support integration tests cover public intake, duplicate retries, receipt/alert recipients, unread isolation, search, CORS, role access, owner approvals, conflicts and throttling. Compiled Worker release verification exercises customer intake and staff rendering. Browser checks cover enquiry form retries, alerts, linked orders, guides, admin navigation and mobile overflow.
