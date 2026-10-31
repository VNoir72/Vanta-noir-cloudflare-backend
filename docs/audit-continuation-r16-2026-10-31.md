## Latest status — owner approved B and push

Fold option B (tonal ivory wearer-left chest, plain cuffs) is published in all four primary views. R2 MD5/size and D1 gallery mappings read back successfully; two detail views preserved. The model-free image scope is **21/21 live**. Owner explicitly approved the repository push on 31 October after the earlier automatic review block. Historical checkpoints below are superseded by this status. Mobile performance investigation and build-32-compatible OTA release are in progress.

# Audit continuation — 31 October 2026

The model-removal pass progressed from 10/21 to 20/21 designs. This is not a declaration that the full audit or manufacturing packs are complete.

## Applied to production

Ten products now have four separate garment-only grey-studio primary images: Switch Carpenter Jeans, Drift Pleated Skirt, Echo Knit Vest, Facet Leather Jacket, Halo Cropped Denim Jacket, Impulse Graphic Tee, Night Study Rugby Jersey, Relay Track Pants, Shelter Puffer Gilet and Tideline Fleece Shorts. Front/back/left/right remain separate from the existing two detail images per product. Images are AI-generated design visualizations, not sample photography or manufacturing artwork. Exact master-vector fidelity is not certified by a generated mockup.

Ten shopper descriptions were rewritten to remove manufacturing instructions and dimensions. Detailed source specifications remain untouched. No runtime code or Workers deployment was changed in this continuation; D1 catalogue mappings and R2 media updates are served by the existing deployed application.

Backups: D1 tables `audit_r16_20261031_products` (10 complete product rows) and `audit_r16_20261031_images` (60 complete gallery rows). Updates use exact old-URL/old-description guards. Applied SQL and guarded rollback SQL are in `data/catalogue-r16/`. Rollback restores only the changed fields when they still match this revision.

## Verification

- All 40 uploaded WebPs matched local byte lengths and MD5 against a fresh R2 object listing; local SHA-256 is recorded in each manifest.
- All 10 front-image public URLs returned HTTP 200 and matched the local SHA-256.
- Public `/api/catalog` returned 763 products, all 40 new primary image URLs in the correct product galleries, and `acceptingOrders: false`.
- D1 read-back: 10 products, each with four replaced primary images and six total gallery rows; zero changed detail-image rows; zero changed detailed specifications, prices, active flags or publication statuses.
- Live Tideline page rendered the model-free front image, four labelled view selectors, separate close-ups, and Coming soon status. Selecting Back changed the hero to the separate back image (2/4). This is a sampled UI check, not a visual certification of the whole catalogue.
- Targeted product-integrity and browse-history tests: 7 passed. TypeScript check passed. No runtime code changed after these checks.

## Fold decision still open

Fold Wrap Shirt has four corrected garment-only review drafts in `data/catalogue-r16/fold-review/`; they are deliberately not uploaded or linked to production. The front reference places a black emblem on the wearer-right cuff and the buckle at wearer-right waist. Its side reference mirrors that construction. Written branding specifies a tonal ivory 35 mm emblem on the wearer-left chest instead of the black cuff emblem. Drafts follow the front reference for geometry and cuff branding. Selecting the approved branding location is required before this set is published. Original live Fold mappings are preserved in `source-gallery-mappings.json`.

## Manufacturing and audit work remains open

- Fold branding and buckle reference conflict above needs an authoritative design decision.
- Tideline front source puts contour artwork on wearer-right and emblem on wearer-left; its written specification reverses those sides and describes a rear welt pocket absent from the source images. The image-only replacement preserves the primary visual reference; manufacturing specifications were not silently rewritten. Reconcile before production.
- Exact garment-specific decorative vector artwork, placement proofs, verified technical sketches, physical sample measurements, fabric/hardware approvals and testing remain required. The R14 windbreaker pack is a layout preview, not a completed factory pack.
- Remaining factory-language leakage in expanded Key features requires a broader presentation-layer pass; only the ten main descriptions were cleaned in this revision.
- Authenticated admin visual review, owner MFA enrolment, and genuine payment/dispatch verification were not completed here. No orders or payments were created.

Do not promote the private candidate measurement table, infer physical stock from legacy quantities, or open order-taking based on these image changes. Existing pending requirements remain pending until their evidence is supplied and verified.

## Repository sync status

Local commit `3373d9596b5c1125f43e1cecbe34b46467bd04b7` contains the assets, mappings, rollback scripts and verification evidence. Terminal push lacked GitHub credentials. The connected GitHub integration uploaded some immutable image blobs, then automatic approval review rejected further public-repository image publication because explicit destination authorization could not be established. No remote branch or commit was created by this continuation. Do not report this local commit as pushed.

A focused history check found a prior public-publication approval summary but could not conclusively resolve the exact question/response ordering and garment-image scope. Further public GitHub writes are paused for explicit approval. Cloudflare media and D1 catalogue updates are already live and verified; this publication block does not undo those changes.

Final public API read-back after the description updates returned all ten revised descriptions and `acceptingOrders: false`.
