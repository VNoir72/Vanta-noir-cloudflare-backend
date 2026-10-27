# Catalogue reconciliation R10 — 27 October 2026

All 35 findings recorded in the R08 review now have a resolved reference status: 20 `corrected-reference` and 15 `reference-view-reviewed`. This includes the 28 reconciled in R09 and the final seven completed in R10. No physical sample or bulk-production approval is implied.

## Final seven

| Product | Resolution |
| --- | --- |
| `vn-p016` Relaxed Cargo Pant | Authored true rear references for Olive and Jet Black, with plain seat, center-back seam and no front drawcord or emblem. |
| `vn-p017` Pleated Wide Trouser | Authored true rear references for Jet Black and Charcoal, with shaping darts, center-back loop and seat seam. |
| `vn-p047` V Buckle Belt | Authored reverse views for both colours showing attachment and folded webbing return while retaining the triangular V frame. |
| `vn-vd-p04-2-25` Winged-Spire Leather Belt | Three visible buckle angles use the unchanged supplied master paths; true rear strap view added. Leather construction, 35 mm strap and proposed 62 × 42.26 mm hardware documented. |
| `vn-pdf-p05-3-r5-c5` Diamond-quilted Vest | Exact supplied master paths applied to front and left views. Ribbed collar, side snaps and proposed 80 × 54.53 mm chest embroidery documented. |
| `vn-pdf-p06-2-r3-a2` Pleated Culotte Shorts | Full-resolution views establish two separate outer legs. Name and construction now describe pleated culotte shorts; four views retained. |
| `vn-pdf-p06-2-r3-c2` Pleated Tennis Skort | Authored attached-inner-short construction with separate inner/outer measurements and construction drawing; existing exterior references retained. |

The supplied master package describes its vectors as reconstructions from supplied raster art, not recovered native originals. R10 preserves those supplied paths exactly. The 1:1 SVGs control silhouette; mockup shading and perspective are illustrative. Hardware CAD/sample and embroidery digitising/sew-out remain physical validation steps.

## Live changes and validation

- Uploaded 12 WebP images, seven correction PDFs and seven reference/artwork ZIPs. Object size and MD5 ETag match local files. Saved attachment records also match byte counts and SHA-256.
- Updated seven product specifications and relevant image pointers. Removed five obsolete gallery rows after creating backups, leaving 4,857 rows.
- All 1,029 product/colour groups retain four labelled directions. This is label coverage, not comprehensive visual certification of every colour and angle.
- Zero changes to the seven products' prices/publication state or their variants' stock, SKU, colour, size and active state.
- Publication totals remain 16 published/active, 731 draft/inactive and 16 archived/inactive.
- Added an admin audit entry. Recovery tables: `catalogue_reconcile_r10_20261027_products`, `catalogue_reconcile_r10_20261027_images`, `catalogue_reconcile_r10_20261027_variants`. Do not blindly replay non-idempotent historical repair SQL.

This pass changed live catalogue data and media. It did not deploy a Worker or mobile build. Existing historical attachments remain available; R10 addenda supersede conflicting specifications and references for their stated scope. The full handoff includes 28 R09 and seven R10 correction PDFs, the seven new artwork bundles and 12 new view assets.

Global studio-grey consistency and comprehensive visual review of every catalogue colour/angle remain separate unfinished work. New R10 mockups use studio-grey backgrounds. The 35 resolved findings must not be described as global catalogue manufacturing approval.
