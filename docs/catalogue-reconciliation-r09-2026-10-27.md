# Catalogue reconciliation R09 — 27 October 2026

This checkpoint records live catalogue-data updates. No Worker deployment or mobile build was made in this pass.

## Result and scope

- Reconciled 28 of the 35 R08 findings at reference level: 13 `corrected-reference`, 15 `reference-view-reviewed`; seven remain `needs-reconciliation`.
- Removed 1,189 exact gallery duplicates (same product, colour, URL, alt text and order), leaving 4,862 rows and zero such duplicate groups.
- Uploaded and attached 29 garment-specific R09 PDFs: 28 reconciled records and the partially corrected Diamond-quilted Vest. All PDF bytes were ASCII-safe for transport, rendered locally, and compared exactly against the objects read back after upload. These are correction/reference addenda, not complete replacement tech packs or physical sample approval.
- The live manufacturer-files page for `vn-pdf-p14-3-r2-c3` visibly lists R09. Browser download testing failed at the browser download layer; end-to-end browser download was not established. R2 readback and attachment manifest validation passed.
- Product publication counts remain 16 published/active, 731 draft/inactive and 16 archived/inactive.

## Corrections

Four four-view designs had mismatched catalogue labels. Their saved names, colour labels, garment types and sampling specifications now follow the inspected references:

| Product | Corrected name | Colour |
| --- | --- | --- |
| `vn-pdf-p14-3-r1-c4` | Street-Art One-Shoulder Crop Top | Ivory / Black |
| `vn-pdf-p14-3-r2-c3` | Street-Art Three-Quarter-Sleeve Wrap Blouse | Black / Ivory |
| `vn-pdf-p14-3-r2-c4` | Street-Art Cropped Utility Shirt | Black / Ivory |
| `vn-pdf-p14-3-r2-c5` | Street-Art Long-Sleeve Wrap Blouse | Black / Ivory |

Their measurement blocks are proposed sampling targets, not image-derived measurements. Pattern and physical-sample checks remain required. The short-sleeve shirt block was transferred to the cropped utility shirt; the fitted wrap block to the long-sleeve wrap; the three-quarter sleeve uses proposed M=42 cm sleeve grading; the one-shoulder retains the existing crop-top chest/length block.

`vn-pdf-p10-2-r4-a1/a2/a3` now say Pleated Wide-Leg Trousers (Black / Charcoal Pinstripe / Burgundy), with one pair as contents. Existing corrections were checked for `vn-pdf-p01-2-17`, `vn-pdf-p04-3-r3-c3`, `vn-pdf-p07-3-r1-c5` and `vn-pdf-p10-2-r3-c5`.

Mesh Jersey `vn-vd-p04-2-07` and Diamond-quilted Vest `vn-pdf-p05-3-r5-c5` main image pointers now use their already-repaired gallery fronts. The vest remains open for exact-master conformity. Burgundy/black camp shirt `vn-pdf-p09-3-r2-a2` now explicitly describes its different front/rear panels.

Existing first-colourway rear mockups were visually checked for `vn-p005`, `vn-p006`, `vn-p008`, `vn-p009`, `vn-p011`, `vn-p019`, `vn-p020`, `vn-p033`, `vn-p036`, `vn-p037`, `vn-p043`, `vn-p044`, `vn-p049`, `vn-p050`. This does not certify all colours or side angles. Jet Black Carbon tee `vn-pdf-p05-3-r1-a1` current references are black, resolving the earlier bone-reference finding.

## Open findings

| Product | Remaining evidence needed |
| --- | --- |
| `vn-p016` Relaxed Cargo Pant | Genuine rear construction reference; current rear is front-like. |
| `vn-p017` Pleated Wide Trouser | Genuine rear construction reference; current rear is front-like. |
| `vn-p047` V Buckle Belt | True reverse view; current rear still presents front buckle. |
| `vn-vd-p04-2-25` Belt | Exact approved buckle/emblem master; front/back inconsistent. |
| `vn-pdf-p05-3-r5-c5` Diamond-quilted Vest | Verify repaired emblem against exact approved master. |
| `vn-pdf-p06-2-r3-a2` Womens Sport Short | Pleated skirt-like reference does not establish hidden inner shorts. |
| `vn-pdf-p06-2-r3-c2` Pleated Tennis Short | Same hidden-construction uncertainty. |

Global studio-grey background consistency remains unfinished. The existing StoreImage mapping covers 3,724 known URLs, but newer R2 references and all colourways have not been comprehensively inspected. Four labelled angles are not proof of four accurate views. Do not mark the entire catalogue manufacturing-ready.

## Recovery and files

Live D1 backups: `catalogue_reconcile_20261027_images` (all 6,051 original rows), `catalogue_reconcile_20261027_products` (original changed product rows), `catalogue_reconcile_20261027_variants` (55 initial variant rows). Audit entries describe the operations. Do not blindly replay earlier non-idempotent repair SQL.

The existing route permits attachment keys under `tech-packs/r4-20261026/`; R09 files therefore use that prefix and names `<product-id>-Visual-Correction-R09.pdf`. Each saved attachment includes byte size and SHA-256; the live handler verifies both. Historical R07/R08 files remain available and must be read with current corrections.

The 29-PDF bundle is saved as `Vanta-Noir-Catalogue-Corrections-R09.zip`, Library file `libfile_22fdb3ff06c08191907ed230feafddf8`.
