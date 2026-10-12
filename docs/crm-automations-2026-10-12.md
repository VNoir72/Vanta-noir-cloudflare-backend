# CRM and automations

Customers now includes unified order, support, subscription and app membership history, calculated segments, editable tags/preferences, and internal notes. Owner-only Automations includes twelve configurable rules, previews, manual runs, failed-run retry, and activity history. Writes use version checks; scheduler runs claim a per-rule lease.

Rules cover payment reconciliation/receipts, low stock alerts, packed-order dispatch, verified unpaid expiry, CRM synchronization, opted-in checkout reminders, Circle lifecycle notices, restock notifications, support assignment/escalation, daily owner summaries, certified scheduled launches, and opted-in delivery care/review messages.

Shipping respects paid/packed eligibility, the configured provider budget and existing booking recovery. Default extra delivery spend is zero. Fastest selection requires comparable transit estimates. Uncertain bookings are never blindly repeated. Launch scheduling requires the current Launch review certification and preserves existing early-access rules.

Checkout reminder and aftercare subscriptions require explicit selection and email confirmation. The outbox checks current consent and rule status before sending. Circle billing remains gated by the existing CIRCLE_BILLING_ENABLED setting; lifecycle automation does not activate billing or create new charges.

Deploy additive migration drizzle/0019_crm_automations.sql before the backend. Preserve all current bindings and the five-minute cron. Deploy the regenerated production storefront for the new checkout preferences. The delivery baseline prevents historic delivered orders receiving unsolicited retrospective follow-ups.

Validation: full Node suite 249 passed, zero failed, one existing skip; TypeScript, compiled release checks and static storefront validation. Browser visual checks could not run because Chromium download was unavailable; jsdom verifies editing, previews, save and unsaved-navigation protection.
