# Vanta Noir catalogue update - 20 September 2026

Brand: Presence. Power. Precision.

## Implemented scope

The approved 01 oversized graphic tee through 07 football jersey are followed by the remaining numbered garments on VD's Season 01 board, through 26 boxer briefs. Approved design-chat boards override the earlier small illustrations for 01-07.

26 product records, five colourways each, front/back/side images for each colourway: 130 colourways and 390 new individual images. Seventeen superseded generic preview listings are archived, preserving their IDs, variants and order history. Distinct previous designs remain published. Final active catalogue: 78 products, 302 colourways, 762 image entries.

Face caps: NGN30,000 each. Socks: NGN20,000 per pair. These prices were approved by the owner. Other prices retain proposed/approved status. No stock quantities are invented; the new designs are preview-only.

## Reference scope still outstanding

The entire VD PDF was reviewed: 16 pages, 29 unique collection boards. The additional boards contain collection-specific alternatives, overlapping categories and some mismatches between labels and pictures. `vd-source-inventory.json` preserves the identified reference slots. They are not asserted to be distinct purchasable SKUs, and are not all converted in this release.

## Artwork and manufacturing

New images use built-in image generation with the approved boards / VD references, one triptych per colourway. A reviewed crop manifest separates the three garment views into website assets. Prompts require the same cut, graphics and colour across angles. New rear/side details not fully visible in source are visual interpretations, subject to sample review.

The PDF is a visual product catalogue, not a complete technical pack, measured grading chart, embroidery file or print master. Fabric composition, GSM, tolerances and artwork dimensions must be specified separately with the manufacturer.

## Data application

`lib/season01-catalogue.ts` imports each product and its images/zero-stock variants in a bounded D1 batch once. Product-level markers allow retry after a partial failure; later admin changes are not overwritten. Superseded records are archived only when their image still matches the known old catalogue. Existing migrations are unchanged.

`portable/catalog-import.sql` is for an empty store after schema migrations. Do not run it over an operating store's stock. Existing deployments receive the bounded update through the new application code. Admin remains the authoritative editor after import.
