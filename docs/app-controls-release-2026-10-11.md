# App controls release audit

Owner authorised push, deployment and APK build after the local review.

Additional fixes:
- Capture app allocation/offer limits on each order and recheck atomically when payment settles. Conflicts record the payment and enter paid_stock_review without allocating stock.
- Recheck restock/drop eligibility at push-send time, including paused drops, disabled alerts, stock and VIP membership; collect benefit push receipt IDs and remove invalid devices.
- Apply discount/reward codes explicitly to avoid quoting partially typed codes.
- Replace stale account security copy with the available cross-platform sign-in methods.
- Android release version 0.1.12; retain existing package and signing identity.

Validation: 228 regression tests passed, 1 PHP-dependent test skipped; focused settlement and revoked-alert checks passed. Root/native TypeScript, Expo lint, production backend build and compiled backend release verification passed. Real device attestation, Google login, notification delivery and rotation still require device acceptance; no live payment or customer notification was sent by tests.

Firebase App Check registration is prepared with the existing APK certificate. Its Google API terms require owner confirmation before registration can complete. No debug bypass is included. App campaigns remain disabled by default. Android Firebase IDs are configured in the Worker; this alone does not prove device verification works.

Existing points programmes, fit profiles, design voting and general-purpose marketing broadcasts are not implemented by this release. They require separate product rules; no rewards liabilities or campaigns were invented.

## Dependency audit follow-up

The initial production-dependency audit reported 4 root and 38 mobile affected package entries (many are inherited findings from the same few dependencies).
- Updated gRPC to 1.14.6 in both dependency trees. Root production dependency audit now reports zero findings.
- Updated mobile UUID to 11.1.1; tested the native project generator's CommonJS usage.
- Backported the official decode-uri-component 0.5.0 fix with only a CommonJS export adaptation for query-string 7. An exact-source-hash guard prevents silently patching an unknown future version. Malformed percent-encoded inputs and normal Unicode/query parsing are tested. Android Hermes export, TypeScript and Expo lint pass.
- npm still reports 27 mobile entries: the scanner does not recognise the guarded decoder backport, and braces/node-forge findings propagate through Expo's build tooling. Official advisories currently list no patched braces/node-forge release. Do not force npm's suggested Expo downgrades or claim all upstream advisories are fixed. Review these again when upstream patches become available.

The first 0.1.12 build was cancelled so the final APK can include this security follow-up.

## Release checkpoint

- GitHub branch: codex/native-app-2026-10-10. Functional source commit: 0b98513c86460e549338763094fa4d6d2d653293. Native build source: ab636e5f917f057fe9a290045be22a67d1489c4f (the later change only filters backend sales counters).
- Full Cloudflare version: 94307b28-53ee-4f72-b24b-ca78390aac9e, confirmed serving 100% of deployment traffic. Existing secret bindings, D1, R2 and assets retained. Previous version: b0d8a0f8-2da1-4600-9a42-90fdcca190c8; pre-release version: 453da912-770e-4a29-ab5b-7d8bdb75e54f.
- Final regression suite: 229 tests, 228 passed, zero failed, one PHP-dependent skip. Root/native type checks, Expo lint and compiled release checks passed.
- Android source map has 1,531 source modules. It includes the patched decoder and excludes braces, node-forge and grpc-js.
- Updated website ZIP saved as version 2 of the existing download. It contains 8,697 files with cPanel-safe permissions. Verification covered 698 pages, 25,171 links/assets and 682 privacy-safe product shells. Namecheap frontend upload remains a separate owner action.
- Direct production-domain checks are blocked by this environment's network policy; do not describe compiled tests as live browser checkout tests.
- Firebase App Check form is prepared with the actual signing fingerprint and outside-Play distribution settings (Device integrity required). Terms checkbox and Save remain untouched pending owner confirmation. No live access campaigns configured.
- Final APK 0.1.12 (22) succeeded (22m 50s build time): https://expo.dev/accounts/vanta-noir/projects/vanta/builds/564b8e04-4af2-4383-ab81-c16e66088d1c . Build 21 was cancelled before completion to include the dependency fixes.
