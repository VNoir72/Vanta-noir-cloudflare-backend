# Security remediation — 2026-10-13

All seven audit findings have code changes. Production rollout must be verified separately.

- Legacy email-code sign-in returns 410. Deletion codes create a single-use, ten-minute deletion grant; it cannot access general customer routes.
- Store sessions require proof of Firebase issuance and current provider account checks. Disabled/deleted/revoked identities fail closed. Old sessions need sign-in once after rollout. Saved-card checkout requires sign-in within ten minutes.
- The Worker counts actual request bytes before parsing (128 KiB, 33 MiB for authorized upload route); checkout is rate-limited before buffering and parsing. Raw webhook bytes are preserved.
- Deletion verification email is limited per IP and recipient plus atomic global caps of 50/hour and 200/day. This bounds spending; distributed abuse can still exhaust the shared allowance. No live messages sent in tests.
- Pending stock reservations are limited atomically to two orders / ten units per email and three orders per source IP. Idempotent retries remain resumable; expired reservations release capacity. Distributed identities/IPs remain a residual bot risk; these limits are not a claim of complete bot prevention.
- Push registration allows at most five active devices per customer and ten registrations/hour. Tokens expire after 90 days without registration and provider-invalid tokens are removed. Token ownership cannot be overwritten by another customer. This bounds stored unverified tokens; it is not device attestation.
- Photo recovery CI builds with read-only credentials and credential persistence disabled. A separate write job downloads only photo artifacts and performs no dependency installation or repository build scripts.

Validation: full backend suite: 255 passed, 0 failed, 1 existing skip. Tests include Firebase disabled/revoked sessions, deletion grant scope and single use, distributed email-budget attempts, concurrent reservations/devices, body-length bypass and exact raw webhook preservation. Payment, Circle, courier, CRM and stock regression tests remain enabled. Firebase and payment APIs were mocked; no real charges, SMS, courier bookings or customer-data extraction.

These backend changes apply to website and Android clients using this API. They do not publish an app to an app store. Earlier pending features (web/iOS push, SMS rollout, MFA) are separate from these seven findings.
