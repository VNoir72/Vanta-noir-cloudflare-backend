# Pending owner-approved specifications and quiet OTA release

Prepared on 16 October 2026 from the 15 October release baseline. This record is a staging record, not a claim of deployment. `current-release-baseline.json` remains the live release record.

## Prepared changes

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

Automatic approval review blocked the Expo production confirmation and the Cloudflare asset upload. No production deployment, OTA release or catalogue ingestion was completed in this continuation. An earlier D1 import file was transferred to its staging upload URL but was not ingested. That staged file is superseded by the final text corrections; generate and upload the current migration before ingestion. Do not reuse expired upload credentials; never commit them.

Once production publishing is explicitly cleared, deploy the prepared backend and storefront, ingest the verified catalogue migration, publish the build-32 OTA from the recorded commit, and verify live counts, health, approval controls, stock adjustments and OTA runtime/channel. Capture the resulting version/deployment/update-group IDs in the live baseline only after success.

Migration generator: `scripts/development/approve-catalogue.mjs snapshot.json approved.json`. It creates the approved JSON and matching SQL with revision `owner-approved-20261015-r07`. The source snapshot must contain complete `products`, `product_variants` and `product_images` arrays, not truncated API output.

## Pack scope and remaining factory evidence

The delivery contains 735 products and 1,001 saved-colourway packs, including archived records. Only four colourways have reviewed vector drawings; the rest use saved product references. Brand approval of saved measurements is distinct from physical factory testing. Supplier articles, measured material consumption, fit/wash results and final production artwork must come from actual factory evidence. These records must remain editable and must not be fabricated.

## Welcome message

The removed welcome screen was the three-page first-run onboarding: “Presence. Power. Precision.”, “Your bag, your account” and “You stay in control”. The separate “Welcome to Vanta Circle” text remains in the payment confirmation flow.
