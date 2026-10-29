# R14–R15 live verification and continuation

## Production changes

The owner explicitly approved the previously blocked production deployments and description cleanup. The corrected storefront and backend were deployed successfully. The follow-up navigation change at `e05aae8ce2fffbcdd8a094d190792245f17cc450` is also live.

- Eight generic Cap / Face Cap names became distinct design names; product identities were preserved.
- Eight noncanonical category assignments were corrected with backups.
- Browser Back and the in-page Back to the collection link retain the 72 loaded cards and the exact previously selected cap position (451.171875 px from viewport top in the live check). Product titles update correctly.
- The selected Signature Spire Cap opens its own product. Similar designs are no longer merged into another product's identity.
- Primary galleries use Front, Back, Left, Right. Details and close-ups have a separate section below.
- The admin shows the approved garment-only grey studio guidance and remains signed in.
- Thirty approved-specification descriptions had old development-draft notices removed. This did not certify samples or change order availability.

## Image replacements

Five of the 21 identified model-worn designs now have four garment-only grey studio images each: Contour Performance Set, After Hours Bowling Shirt, Block Party Varsity Jacket, Courtside Mesh Jersey and Frequency Graphic Tee. Their source/output manifests and hashes are in `data/catalogue-r14/*-image-manifest.json`. Immutable media files and previous product/gallery records are retained. Existing detail images were preserved.

The Frequency images were corrected to solid charcoal to match its saved material specification; the earlier washed render was discarded. Block Party's small chest emblem was corrected before upload. These are design visualizations, not photographs of produced samples or print masters.

Sixteen identified model-worn designs / 64 primary views remain. Other backgrounds also require visual review; an image absent from a mapping is not necessarily defective. Compare both the saved specification and the reference before generation. Do not mirror branded art or carry styling garments into the product image.

## Customer copy follow-up

A storefront-only formatter removes the known manufacturing workflow appendix from the Fabric field and excludes internal artwork/branding instructions, obsolete image requirements and unweighed mass/price workflow notes from Key features. Admin and manufacturing exports retain the complete source record. Ordinary material qualifications and care guidance remain intact. Targeted tests and TypeScript passed; the fresh storefront export passed 698-page / 27,948-link verification. This follow-up still needs its deployment and live check recorded below.

## Measurement recovery — not a manufacturing release

Coverage remains 702 apparel charts plus 61 accessory dimension records, not proof that every applicable POM is complete. The audit found missing auxiliary dimensions, including the Noir Circuit top and After Hours shirt.

Saved historical targets produced 600 schema-valid recovery candidates containing 13,410 additions. These can include shared-template assumptions. Automatic review blocked broad promotion into approved manufacturing charts. The 110 charts that initially received 2,870 additions were restored to their original saved charts using exact-current-value guards; all 110 restorations succeeded. No original approved numeric value was changed.

All 600 candidates were retained separately in a private audit table, marked `unverified_design_candidate` with reference-status charts and an explicit non-release note. Neither storefront nor manufacturing exports read that table. Five conflicting source sets and six schema/unsupported-only cases remain in the audit work files. Individually verify garment applicability, grading and geometry before promoting any candidate. Do not claim sample fit or physical testing from a digital chart.

## Tech-pack layout candidate

`lib/tech-pack-board-template.mjs` remains an unconnected layout candidate, not the production endpoint. It uses the reference's 1536 × 864 CSS dimensions and exports at 1152 × 648 PDF points. A rendered 20-page Hooded Windbreaker Set preview includes four saved views, existing reviewed style-specific sketches, saved size charts, methods, construction, artwork instructions, SKU register and production-record requirements. Page/panel overflow checks passed.

The template refuses to reuse another garment's technical drawing. Most catalogue records still need garment-specific sketches and decorative artwork. The supplied master-vector archive was recovered; its README identifies approved reconstructions from raster references, not original native source files. It does not contain every garment-specific print. Do not remove historical files until verified replacements exist. The layout preview is not a completed factory release.

## Remaining launch dependencies

The catalogue is published as previews, and store-wide order-taking remains off. Do not infer physical stock or confirmed factory capacity from legacy numeric inventory. Missing prices, dispatch commitments, exact garment artwork and verified specifications cannot be replaced with fabricated facts. No orders, payment settings or customer records were changed.

## Validation

- Prior full suite: 325 total, 324 passed, one skipped, zero failed.
- Current targeted navigation / product identity / shopper-copy tests: seven passed.
- Current TypeScript: passed.
- Fresh storefront: 698 pages, 27,948 local links/assets, privacy-safe shells and current-entry checks passed.
- Live After Hours page: four model-free views, separate close-ups, correct garment identity and clean description confirmed.
