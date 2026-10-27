# R12 storefront audit corrections — 27 October 2026

Owner approved the eight audit proposals and implementation/deployment.

## Changes

- Preserve the R11 detailed measurement and multi-component sizing fixes.
- Keep published pages and configuration fresh; cache successful hashed JS/CSS for one year and image responses for one hour. Never cache errors, private routes or dynamic configuration.
- Load storefront, account, checkout and supporting routes independently before hydration. Use identical route loading during static rendering. Load all generated CSS before hydration to avoid unstyled route content.
- Replace the repeated full studio path map in the browser bundle with an exact membership index. Unknown/new references remain unchanged. All 3,724 mappings are tested against the original manifest.
- Give the editorial homepage a main heading after hydration.
- Keep product detail galleries stationary while preserving direct view selection, swipe, keyboard and zoom controls.
- Restrict the newsletter popup to the homepage; delay after interaction and suppress it when the bag is open. Inline product/footer subscription remains available.
- Clarify the cap and sock brand target dimensions and provisional care instructions. Do not invent shoe-size allocation or claim a physical sample was measured.
- Permit explicit --reuse-images builds for connector code-only releases. This release changes no binary images and retains the previous deployed asset binding. Normal builds continue to optimize images.

## Live catalogue changes

Ordering was closed. The four audited published products (vn-p042, vn-season01-01, vn-season01-25 and vn-season01-26) were switched to preview. Their 21 positive-stock variants, totaling 93 units, were zeroed. No active reservations existed at preflight. Stock adjustments record every change. Settings, product details and variant quantities were backed up in store_meta under audit-r12:* keys before mutation.

The approval reviewer rejected a broader draft-inventory reset. Draft and other non-audited inventory was therefore left unchanged; the successful mutation was limited to the four approved products. All 16 currently published products are now preview-only.

## Validation

- 315 tests passed; one pre-existing test skipped (316 total).
- TypeScript typecheck passed.
- Static verification: 698 pages, 27,948 local references; privacy-safe shells preserved.
- Homepage initial JS plus static dependencies: 1,428,812 bytes, versus the previous 1,846,640-byte entry alone (22.6% smaller on this conservative comparison).
- All 1,029 product/colour groups have front/back/left/right labels; no blank image URLs or orphan image rows.

## Limits

Gallery labels are not a visual certification of all 4,857 photographs. Physical sample measurements, shoe-size fit allocation, wash testing, real payment/dispatch completion, authenticated admin visual review and owner MFA enrollment remain separate verification work. Draft inventory is not verified physical stock. No draft products were published.
