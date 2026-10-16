# Account and service fixes — 16 October 2026

## Changes

- Account deletion resolves Circle billing before changing either identity. Local cleanup and the Firebase deletion job commit in one D1 transaction. Firebase failures retry from the existing five-minute maintenance schedule; pending deletion cannot create a new store session. A deletion grant survives prerequisite/transaction failures and is removed with the account.
- Website sessions use host-only Secure, HttpOnly, SameSite=Strict cookies. Cookie access requires an approved Origin and an explicit web header. Legacy bearer sessions migrate once and are removed from browser storage. Mobile bearer authentication remains compatible. Firebase browser credentials use memory persistence.
- Verification and password-reset emails use Resend with links generated and validated by Firebase. Verification recipients come from validated identity claims plus the current provider record. Reset responses do not disclose whether an account exists. Per-IP, per-recipient and shared service budgets apply. Links and credentials are never returned in the API response or logged.
- Storefront CSP restricts executable scripts and disables inline handlers. Existing Firebase/Google sign-in, consented analytics, images and media remain allowed. Admin's existing CSP is unchanged pending authenticated visual validation.
- API log query-string redaction is enabled. A failed automation cycle no longer prevents later scheduled maintenance.
- Existing saved-card functionality is enabled with migration 0018 and a cryptographically generated server-only AES-GCM key. Saving still requires consent and owner-validated successful payment; raw card numbers/CVV are not stored.
- Android email changes are ported to the installed build-32 source. Native dependencies, lockfile, app configuration, fingerprint and quiet update behavior remain unchanged.

## Verification

- 24 focused tests passed: identity verification/revocation, deletion failure recovery, cookie migration and Origin protection, email delivery failures/budgets, card isolation/encryption, duplicate payment protection and maintenance/security behavior.
- Root TypeScript passed. Mobile lint, TypeScript and three design-behavior tests passed on the shared source; the EAS workflow repeats mobile checks on the exact build-32 source before publishing.
- Compiled backend verification passed, including authenticated admin rendering, role boundaries, concurrency, CORS, R2 and catalog checks.
- Release IDs and final storefront/build-32 verification are recorded in current-release-baseline.json after publishing.

## Remaining external acceptance and owner actions

- An actual inbox click and installed Android-device acceptance remain necessary; mocked provider tests do not prove delivery to a mailbox.
- Admin Access still uses email OTP. Stronger MFA needs the owner's authenticator or a suitable configured identity provider. Customer authenticator enrollment screens already exist; provider activation/recovery and device acceptance remain to be confirmed.
- Shipping uses live international Shipbubble rates. Fund the shipping wallet and supply measured parcel weights/dimensions. Approved estimates are not measured values. A real Shipbubble webhook event has not yet been observed; configure/confirm provider delivery without creating a paid test shipment.
- SMS is not enabled: no replacement provider has been selected/connected. Keep verification for phone ownership, not every login. Resend handles email, not SMS.
- Browser push, Apple sign-in/iOS release credentials, web/iOS App Check, a full restore rehearsal and remaining build-tool advisories remain separate work. Do not change the Android native runtime to resolve build-tool findings without a native release plan.
- Google Play organization enrollment, verification and fee require the owner. A free app does not generate revenue merely from downloads.

No production customer deletion, card charge, shipment booking, inventory replay or factory approval was performed during these checks.
