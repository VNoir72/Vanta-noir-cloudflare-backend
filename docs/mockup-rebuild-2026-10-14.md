# Approved mockup structural rebuild — 14 October 2026

This supersedes the earlier accent-only admin/storefront pass documented in admin-storefront-tech-green-2026-10-13.md.

## References used

- Vanta Noir simplified admin proposal.png: navigation, products, app controls, settings tiles and marketing rows.
- Vanta Noir owner admin workspace.png: overview chart/donut/recent-orders arrangement and order drawer.
- Vanta Noir storefront preview board.png: text wordmark, adjacent navigation, search, hero composition, desktop filters and product grid.
- User-provided garment detail desktop/mobile references: thumbnail rail, compact specifications, colour/size selection, price strip and mobile purchase bar.

The explicit four overview metrics override the three-metric reference. Gold accents are replaced by the configurable tech green. Actual catalogue content, stock, prices and operational states remain authoritative.

## Changes

Admin: dark compact sidebar; neutral workspace; compact metrics; smooth revenue chart; order-status donut; recent-orders table; order drawer; single-row product search/status toolbar; compact product rows and visibility states; Experience/Membership/Sign-in tabs; compact Circle card; row-level app editing; settings tiles; marketing tabs and compact automation rows. Existing tools remain reachable and unsaved-change guards remain active.

Storefront: text wordmark with Shop all/Women/Collections, visible desktop search and icon actions; liquid-glass header; approved hero wording, broad folded green ribbons and floating existing garment; rectangular hero action; desktop filter sidebar and four-column square product images; swatches and size chips; compact desktop garment specifications with price strip before purchase. Mobile keeps price under the title and the glass purchase bar. Existing hero size settings, mobile filter logic and product availability checks remain in use.

Identifiers: compact visible labels remain in the UI. Full existing SKUs, payment/order references and carrier tracking values are preserved for matching, editing, copies, exports and provider requests. This release does not migrate those external identifiers.

Appearance: separate admin/storefront accent controls remain under Store settings → Website design. Light, dark, device and scheduled modes remain. The browser preference was restored to Auto · device after review.

## Verification

Live desktop checks: overview, recent orders, products, settings, dark mode, owner accent controls, app-control row editing and cancellation, order drawer, storefront hero and collection navigation. No order, stock, payment, notification or shipping changes were made during review.

Admin source bd822d47750b6f0935c7d8aef09f611d431584ac passed its full Cloudflare build, type checks, mobile lint, 263 passing tests (one existing skip), and backend release verification. Version 6163faa5-8e32-4023-9a5f-687d75d07baa, deployment 7cb28dda-da44-452d-bdf4-571f2e86d461, 100% production traffic.

The storefront build of bd822d4 stopped at a privacy assertion because its JavaScript asset hash was entry-CapDrLme.js and a catalogue product is named Cap. Reproduced locally from the exact tree. The assertion now excludes only hashed /assets/*.js and *.css URLs; visible text, metadata, inline data and empty-product-shell checks remain enforced.

Storefront structural release source: 64638023ff576dd52969a207efaede208e5fbf09. Cloudflare build 3048cfc7-1bb2-4e48-bd3c-741447ac68df passed. Version e5d3bdbc-08e5-4db8-bd02-d3dd9629e181, deployment 8657d2c3-6893-406d-92d3-9e02f9b286cb, 100% production traffic. Full suite: 263 passed, one existing skip, zero failures; 698 pages, 22381 local references and 682 privacy-safe product shells verified.

Final garment text alignment source f2449b2a71ffca7100e58cc111e290ca2cbc7311: build 62f36932-9ff3-48cd-a404-1cbb00d8fcac passed; version 31983559-8c49-44d2-94f2-fad7f65a6d6d; deployment f6090727-056e-4369-92ce-a70bace7f200 at 100% traffic. The final live storefront check confirmed the hero action, four-column catalogue with size chips and sort control, and compact garment price/specification layout.

## Limits

Physical phone/iPad and native Android testing are not claimed. Native Android files were not changed and no Android build was started. The current catalogue garment art and generated SVG ribbons are used; the original raster mockup artwork has not been transplanted pixel-for-pixel. Desktop visual comparison verifies the rebuilt layout, not pixel identity to every reference image.
