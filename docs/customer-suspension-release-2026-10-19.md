# Customer account suspension release — 19 October 2026

Owner explicitly approved upload and production publication in the active session.

- Source: `82fae9046fb26992fd8091f5e9ed18cd2c388595`, branch `codex/customer-account-suspension-2026-10-19`.
- Worker: `vanta-noir-api`.
- Version: `08a28b6b-096e-4384-8d8c-5bef259cab05`.
- Deployment: `82a17707-cdc8-4e7f-ac29-067e3f863cc9`, 100% traffic, 2026-10-19 17:51:38 UTC.
- Rollback version: `ec40bf45-f044-4d07-a50b-83a0d8972260`.

Owner-only Suspend / Restore controls appear in Customers → customer profile → Store account access. Both actions require a reason and confirmation; the backend enforces owner permission and optimistic version checks. Suspension revokes store sessions and blocks store login and new checkout using the suspended email. Restoration requires fresh sign-in. Actions retain an administrator audit record and preserve customer, order and payment data. This is a durable store-level restriction, not a Firebase project-wide disable operation.

The saved release archive checksum was verified before restoring its compiled modules. All 262 server modules match that saved tested release. Eight account-access/session/Firebase/UI tests passed again, and the compiled release verification passed, including bounded invalid authentication, admin rendering, permission boundaries, catalogue, D1 and R2 fixtures. All referenced client imports are present.

Cloudflare independently confirms the new version at 100% traffic. All existing Worker bindings and script runtime/asset routing settings match the prior release; observability and query-string redaction remain enabled. The existing request-body timeout fix is preserved. No database migration, real-customer suspension, order, charge or refund was performed. No mobile files, native dependencies, Expo runtime/fingerprint or OTA update were changed.

Live owner-click acceptance and installed-phone acceptance are not established by automated checks.

Live checks: storefront returned HTTP 200; unauthenticated GET and POST to the account-access endpoint were redirected to the Cloudflare Access sign-in gate (HTTP 302); the live admin JavaScript bundle matched the release bytes and contains both Suspend and Restore controls. No authenticated production account action was exercised.
