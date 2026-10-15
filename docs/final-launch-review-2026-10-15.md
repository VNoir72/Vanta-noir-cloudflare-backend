# Final launch review — 15 October 2026

Baseline: current production website, admin and build-32-compatible app. Changes build on commit 819932c5edccf3a174619fbf153fa36231138a33; this is not a redesign or a new native build.

## Changes

- All 735 catalogue records retain positive selling prices. Existing prices are preserved and can be edited in admin.
- Missing construction details use R06 sampling proposals based on garment family, saved materials and existing design instructions. Existing recorded specifications take priority. Socks, knitwear, bags, structured garments and non-textile accessories have distinct methods.
- Packaging and quality targets are editable product fields. All 735 records have them. Existing artwork and silhouettes are retained. Publication, inventory and sample approval are not fabricated.
- Per-product database rollback snapshots preserve original details, price and update time under `garment-r06-backup-20261015:<id>`.
- Website account overview gains the shared profile shortcut, order states, saved-items link, coupons, delivered-product review requests, addresses, country/currency and help controls. Device push and native appearance controls remain in the app.
- Accent text uses actual luminance of the selected ink. Website and app agree across the five presets and 4,096 additional RGB samples, each meeting a 4.5:1 text contrast ratio. Hardcoded subscription borders, delivery progress and account selection styling now use the selected accent.
- Removed the automatic first-run introduction and unreferenced emblem component/asset. Kept required platform splash handling, consent and authentication. Files potentially referenced by the live catalogue were not deleted merely because source imports did not mention them.
- Oversized request rejection no longer waits indefinitely for a stream cancellation promise.

## Verification and limits

The local regression run completed with 276 passing tests, zero failures and one environment-dependent PHP check skipped. Relevant tests cover authorization, role revocation, payment idempotency, shipping-address verification caching, catalogue visibility, uploads, concurrent stock operations, settings persistence, colour contrast and request-size enforcement. Release builds repeat their required checks.

Root production dependency audit: zero known advisories at audit time. Mobile audit: 27 reported dependency entries reduce to three underlying advisories. The URI decoder security fix is already backported and tested. `braces` and `node-forge` remain upstream build-tool advisories without a patched version in the inspected registry. A fresh Android export contains neither package; the patched decoder is included. This is containment, not a claim that the audit is fully clean.

The OTA update 3e93dad8-997b-4f20-9b36-6828c166936d targets the existing build-32 runtime 9829b16b33975c503904e03aebd352fa673a78ca. Publishing does not establish that an individual phone has downloaded and applied it.

This review is not a guarantee that every possible vulnerability has been removed or every source line manually inspected. Signed-in website acceptance, real-device background/resume behaviour, final payment and courier acceptance, and the exact installed phone remain distinct checks. No live payment or paid courier booking was made for this review.

## Manufacturing approval

The R06 packs are development packs. Only four saved colourways have reviewed vector drawings; the remainder retain product reference images. Numeric proposals are design targets, not measurements extracted from photographs. Factory pattern/fit approval, verified fabric composition, supplier article numbers, artwork production files, consumption, wash tests and physical parcel weights still require real evidence. None of the 735 records was marked sample-confirmed by this pass.

Sources used for construction methods:

- https://www.coats.com/en-us/info-hub/Basic-stitch-types/
- https://www2.shimaseiki.com/wholegarment/business/
- https://lonati.com/en/products/ge544f/
- https://www.coats.com/en/industries/apparel/applications/intimate-and-underwear/knickers/
