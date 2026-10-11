# App controls release audit

Owner authorised push, deployment and APK build after the local review.

Additional fixes:
- Capture app allocation/offer limits on each order and recheck atomically when payment settles. Conflicts record the payment and enter paid_stock_review without allocating stock.
- Recheck restock/drop eligibility at push-send time, including paused drops, disabled alerts, stock and VIP membership; collect benefit push receipt IDs and remove invalid devices.
- Apply discount/reward codes explicitly to avoid quoting partially typed codes.
- Replace stale account security copy with the available cross-platform sign-in methods.
- Android release version 0.1.12; retain existing package and signing identity.

Validation: 226 regression tests passed, 1 PHP-dependent test skipped; focused settlement and revoked-alert checks passed. Root/native TypeScript, Expo lint, production backend build and compiled backend release verification passed. Real device attestation, Google login, notification delivery and rotation still require device acceptance; no live payment or customer notification was sent by tests.

Firebase App Check registration is prepared with the existing APK certificate. Its Google API terms require owner confirmation before registration can complete. No debug bypass is included. App campaigns remain disabled by default. Android Firebase IDs are configured in the Worker; this alone does not prove device verification works.

Existing points programmes, fit profiles, design voting and general-purpose marketing broadcasts are not implemented by this release. They require separate product rules; no rewards liabilities or campaigns were invented.
