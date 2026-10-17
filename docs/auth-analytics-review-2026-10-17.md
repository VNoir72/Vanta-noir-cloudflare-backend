# Authentication analytics and reconciliation — 17 October 2026

Signup is recorded after Firebase creates an identity. Login is recorded only after the store accepts the verified identity and saves the session, including MFA and email-verification completion. Google/Apple signup uses Firebase's isNewUser result. Session refresh, profile updates and security reauthentication do not emit login. Events contain only the method, never email, tokens or customer identity, and retain existing analytics consent gates.

Build32 changes are ported onto its existing release source at 1bf1f55. Its native configuration and dependency files remain unchanged; do not publish the shared source's newer native dependencies to build32.

Read-only reconciliation for September 19–October 16: six website purchase references and one Android reference all match paid orders. Website merchandise values total NGN395,000 and match order subtotals to rounding precision. Android's matched order has NGN12,000 merchandise plus NGN7,254.26 shipping. Android sends NGN; its Analytics property displays USD (USD9.01 reported purchase revenue). No repeated transaction IDs appeared among these seven purchase events.

There are nine paid orders in the database's UTC date window. Two references were absent from the queried Analytics reporting window. The cause is unestablished; consent, receipt visits, blockers and report timezone can affect coverage. No backfill, payment, order or inventory changes were made. Gateway settlement was not independently audited.

Security review: the historical customer-web key ends sx90 and is the Android key; occurrence date is not key creation date. Actual build32 APK package and signing certificate match the observed Android restriction. Website key ends 7uqg. Earlier read-only endpoint tests confirmed referrer enforcement for the website key and browser-request blocking for the Android key; management probes required OAuth/IAM. These checks do not replace a data-rules audit or per-key request history. Google Cloud Console and Cloud Shell are unavailable in this browser; Firebase aggregate user counts cannot establish per-key use. No keys rotated, API allowlists reduced, or GitGuardian incidents closed.

Validation: web typecheck, consent/purchase tests and static storefront verification; native typecheck, lint, authentication, consent and sign-out behavior tests. Root ESLint could not run because this repository has no root ESLint config. Production release identifiers are recorded after publication.


Released October 17, 2026:
- Website source fde88cb48fd47763a0d3ac55d3d5be52f51cef44, Cloudflare version 87f37a10-716d-430b-8a74-fa8af236ddeb, deployment eec8024b-ebbd-4f1a-aaf3-e0a737e8f26c at 100%. Live account page loaded entry-C0Wr9q04.js.
- Android source 2412ce299b634b8ace967224010fb33498d5b026, production update group 14189627-b499-48a4-acf4-954423697c50. Expo workflow 01a1499f-022d-7748-baac-7e00a4192b02 succeeded. Runtime/fingerprint 9829b16b33975c503904e03aebd352fa673a78ca exactly matches build32. No new native build.
- Successful real-customer Analytics delivery has not yet been observed after release. Auth success and consent behavior were verified in focused tests; no real customer account was created or payment made for this release.
