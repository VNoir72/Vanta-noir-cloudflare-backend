# Completed owner-approved specifications and quiet OTA release

Completed on 16 October 2026 from the 15 October release baseline. `current-release-baseline.json` records the verified live versions, source commits and rollback targets.

## Released changes

- Garment names replace VD identifiers in display labels; stable database IDs and URLs remain intact.
- Existing saved specifications and size charts receive an editable brand-owner approval status dated 15 October 2026. Numeric chart measurements, prices, colourways, publication status and fulfilment modes remain unchanged.
- The catalogue migration adds three units to each of 4,327 active variants belonging to the 704 drafts: 12,981 units total. One variant with two units becomes five; other draft variants become three. It does not publish draft products.
- Thirty-two belt/sock variants labelled `Size pending` become `One size`, using their saved accessory dimensions.
- R07 tech packs use owner-approval language, actual saved label/packaging specifications, separate accessory dimensions and additional pages to prevent content overlapping footers. Blank or inapplicable garment dimensions are not invented.
- The app verifies actual API success before showing a connection failure, suppresses transient timeouts and dismisses the notice after seven seconds. Recovery is automatic.
- OTA updates download quietly while the app is active, with checks at most every 15 minutes. There is no forced reload; the download applies on the next normal launch and preserves the active screen during the session.

## Android release source

- Installed build target: 32.
- Baseline source: `792ed40fa3798c57e8e7ae27c16c2d2563d20fc3`.
- Branch: `codex/build32-silent-refresh-2026-10-15`.
- GitHub commit: `e6b937d566009966171d7c91d8aac02b28294b6b`.
- Native runtime and fingerprint: `9829b16b33975c503904e03aebd352fa673a78ca`, verified against the installed-build baseline after dependency installation.
- Production workflow: Android design update. Native configuration, dependency versions and lockfile were not changed. No new APK is required.

## Validation

Root TypeScript checks and focused specification, sizing and tech-pack tests passed. Android lint, TypeScript and design-behaviour checks passed. The Android production export succeeded. Backend and storefront builds succeeded; storefront privacy-safe shells, campaign/security rules, 3,724 photo mappings and startup JavaScript budget checks passed. Physical phone acceptance is still needed after release.

The catalogue SQL was tested twice against a local database: stock increments are idempotent, original records are captured, and measurements/fulfilment settings are preserved. Updates use saved-value guards to avoid overwriting concurrently changed catalogue records. Before ingestion, re-read the live catalogue and reconcile any changed records; do not treat skipped rows as successful updates.

## Approval and deployment status

The owner explicitly approved the remaining PDF upload and public GitHub publication after the earlier automatic approval review pauses. Those actions are now complete.

- Android production OTA group: `102540ba-1849-45d8-8a9e-38421fc552ce`, from commit `e6b937d566009966171d7c91d8aac02b28294b6b`, with the unchanged build-32 runtime recorded above.
- Storefront: version `36a704c5-2302-4534-9aa7-5109a4ddf8ea`, deployment `41f16797-db3d-4b5b-ae69-e83835367a83`, serving 100% of traffic.
- Backend/admin: version `3da4438e-437e-42d5-b845-f8a1a2688572`, deployment `d4f7a68c-a7c3-4b3f-9843-a7d2b4fd99d6`, serving 100% of traffic. Corresponding source and final PDF manifest: `efecc51c6e606ed476221153e4c20dd3bd2d9eb7`.
- Catalogue revision `owner-approved-20261015-r07` is ingested: 735 approved products and 4,327 distinct stock adjustments adding 12,981 units. No duplicate adjustments were found. Publication counts remain 704 draft, 15 published and 16 archived. Do not run the stock migration again as a new revision.
- All 1,001 R07 objects exist in private R2 storage; every byte length and SHA-256 metadata value matches the deployed manifest. The temporary bounded importer is disabled.

Migration generator: `scripts/development/approve-catalogue.mjs snapshot.json approved.json`. The complete approved snapshot and original-row rollback records were retained; future migrations must reconcile current live values rather than replay this release blindly.

## Pack scope and remaining factory evidence

The delivery contains 735 products and 1,001 saved-colourway packs, including archived records. Only four colourways have reviewed vector drawings; the rest use saved product references. Brand approval of saved measurements is distinct from physical factory testing. Supplier articles, measured material consumption, fit/wash results and final production artwork must come from actual factory evidence. These records must remain editable and must not be fabricated.

## Welcome message

The removed welcome screen was the three-page first-run onboarding: “Presence. Power. Precision.”, “Your bag, your account” and “You stay in control”. The separate “Welcome to Vanta Circle” text remains in the payment confirmation flow.

## Final file validation and delivery status

The final R07 export contains 1,001 PDFs and 18,084 pages. All passed page-count and footer-overlap validation; representative garment, accessory and artwork pages were visually checked. After scratch cleanup removed 386 pending PDFs, they were reproduced from the approved snapshot and committed template, retaining page counts. Their regenerated checksums are recorded in the final manifest. All 1,001 private R2 objects now match that manifest.

The earlier batch replacement of the standalone delivery ZIP archives timed out without a completion receipt. Those historical downloadable archive replacements are not confirmed by this deployment. A separate private recovery checkpoint was saved successfully before resuming the final upload. This record confirms the live admin PDF set, not replacement of those older offline archive files.
