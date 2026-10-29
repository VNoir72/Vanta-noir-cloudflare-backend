# R14 live verification and continuation

## Actual production state

- Eight generic Cap / Face Cap names were changed to distinct design names. Product IDs, slugs, prices and inventory were preserved. Reversible backup retained.
- Eight noncanonical category assignments were corrected. Reversible backup retained.
- Contour Performance Set now has four garment-only grey studio images in R2 and the live product record. Source and output hashes are in `data/catalogue-r14/contour-image-manifest.json`. Reversible backups retained. Two existing detail images were retained.
- No product was newly certified for order-taking in this revision. Prices, stock, capacity and actual factory test results were not invented.

## Deployment correction — blocked, not complete

R14 code was committed at `7a3fc8b8d1001c5d41fd2f15cf97b94a32b8aa5a`. Cloudflare accepted deployments, but live browser QA found the storefront still loaded an older entry bundle (`entry-BAQivoKD.js`). Back navigation returned to 36 cards after opening a product from a 72-card collection. The live admin also still displayed old model-image guidance. Do not call these fixes live.

A clean storefront rebuild loads `entry-BwhNZQTB.js`. Commit `ae2f5997b300f9a3a94afb0bee2a64732529ab90` adds verification that every rendered page references the current build manifest entry. The clean export passed verification (698 pages and 27,948 local links/assets). Never restore an entire previous output directory when reusing images; restore only needed binary image paths.

Corrected storefront and backend builds have been prepared and validated. Automatic review blocked production replacement. No retry or alternative production deployment was attempted after that rejection. Private infrastructure identifiers and transfer records are kept outside the repository. Obtain the required deployment approval and verify Back navigation live before marking this complete.

## Image work outstanding

The audit identified 21 model-worn designs. Contour is replaced; 20 designs / 80 primary views remain. Original views are retained in `work/r14/model-originals`. The next After Hours generation batch was aborted and produced no saved replacement files. All other backgrounds also need a completed visual review; a URL being absent from the old studio mapping does not by itself prove the background is wrong.

## Tech-pack layout candidate

`lib/tech-pack-board-template.mjs` is a new, unconnected layout candidate. It does not replace the production endpoint yet. The reference image is 1536 × 864 pixels; the candidate uses the same CSS dimensions and exports at 1152 × 648 PDF points (96 CSS pixels per inch). A 20-page Hooded Windbreaker Set preview includes four saved garment views, existing reviewed style-specific sketches, saved size charts, methods, construction, artwork instructions, SKU register and production-record requirements. Page and panel overflow checks passed. The source-specific SVG/EPS/PDF artwork package is explicitly not linked, so this is not a completed factory release.

The template refuses to reuse one garment's reviewed technical drawing for another garment. Most catalogue records still need their own verified sketches and exact garment artwork. Do not remove historical source files until a complete replacement has been verified.

The supplied `VANTA_NOIR_Master_Vector_Geometry_2026` archive was recovered. Its README says its vectors are approved reconstructions from supplied raster artwork, not recovered native source files. Preserve that provenance. The archive alone does not contain every garment-specific decorative print.

## Description copy and measurements

Thirty owner-approved specification records still have public descriptions labelled as development drafts. Automatic review rejected removing their sample-approval caveats, citing the risk of misleading customers/manufacturers. The proposed description update was not applied. Do not bypass that rejection.

The previous catalogue baseline has 702 apparel charts and 61 accessory dimension records. This is coverage, not proof of completeness: the admin inspection found missing auxiliary POMs in the Noir Circuit top chart. Verify all required garment-specific POMs, rather than claiming every size chart is complete. Factory sample measurements and tests remain distinct from owner-approved design targets.

## Validation

- TypeScript: passed.
- Full tests including the new board checks: 325 total, 324 passed, 1 skipped, 0 failed.
- Board layout tests verify dimensions, retention of saved numeric sizes, escaping, no unrelated technical flats, and explicit missing-view/size issues.
- Live Contour product page visibly loads the new model-free front photo. Its gallery still uses the old ordering until the corrected browser bundle is deployed.
