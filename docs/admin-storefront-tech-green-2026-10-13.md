# Tech-green compact admin and storefront

Requested direction: combine the compact owner workspace and simplified Vanta Noir admin layouts, using tech green instead of the reference gold. Preserve existing store hero sizing, campaign artwork, floating garments and filters.

## Implemented

- Overview: orders to prepare, sales, low-stock variants and measured GA4 purchase conversion. Links open their actual management sections; unavailable conversion stays unavailable.
- Existing curved area chart retained, recolored through the owner accent, with grid lines and active dots removed.
- Primary navigation condensed; every other tool remains in More tools. Product workspace has catalogue tabs and disclosure actions.
- Deep noir dark palette, existing light/device/scheduled appearance controls, glass surfaces and restrained press/hover feedback. Reduced-motion preferences are respected.
- Long order references and inventory SKUs use abbreviated display labels with full-value copy and a manual-copy fallback. Database identifiers, exports and status mutations are unchanged.
- Owner-only commerce settings include independent admin and storefront accent colors. Strict hex validation, existing per-field save/conflict handling, immediate same-tab saved-setting updates and contrasting button text. Default #c8ff65. App controls links to the editor.
- Store navigation: Shop all, Women and Collections, with secondary informational links in the mobile menu. Existing search, saved items and bag controls retained. Collections use actual catalogue labels.
- Product details: selected color below title, three existing product-information tiles, color swatches, rounded size buttons, collapsed details/care, delivery disclosure and support. Mobile has a glass save/add bar sharing the existing stock and preview checks; desktop retains the main action. Tablet layout and existing selectable gallery views retained.
- Hero dimensions, configured media, floating garment behavior and filter implementation preserved.

## Validation and limits

- TypeScript check passed after implementation.
- 15 focused accent/schema/conflict, admin theme and reporting checks passed.
- 18 storefront header, gallery, catalogue browsing, hero and merchandising checks passed. Header test updated to assert the three requested destinations and preserve search/menu/bag behavior.
- Local file preview was blocked by browser policy. After deployment, live desktop inspection verified light/dark themes, the four overview metrics, compact order/SKU labels, owner accent controls, storefront navigation and garment gallery/size interactions. Physical iPad/mobile verification is not claimed.
- Both Cloudflare production builds and release gates passed. This release updates the website and API/admin; it does not start another native Android build.

## Publication follow-up

- Extended compact labels to order search, bulk order review, support/CRM, payment updates, returns, email alerts, sales desk and customer order history. Full tracking and SKU editing is behind a disclosure; copied values, CSV exports, packing slips and provider calls retain the real identifier.
- New automatically suggested SKUs are stable, size/color-specific codes of at most 12 characters. Existing stock keys and provider identifiers are not rewritten.
- Full local suite: 263 passed, one existing skip, zero failures. Security-sensitive admin authentication, checkout pricing and Paystack logic match the currently deployed 331c9e6 source.
- Production hosting is already Cloudflare for both API/admin and storefront. Added reproducible storefront packaging and a source revision marker on /health. Namecheap is the existing fallback and does not need a separate upload for this release.

## Published release — 2026-10-14 UTC

- Storefront source: `17d991c9999eabb6de015b53d89ef11e52efb2c0`. Version `ac176ff0-073f-480f-b3bb-c56e1b0e7d4b`, deployment `f967690f-e742-4eaa-b8b4-20c5efe8815e`, 100% traffic. Public `/health` returned this exact source.
- Admin source: `a3bd51d7734e7ff6fd7b50e7021aa583db4b527c`, including a final accent-contrast correction for the Staff portal action. Build `fa837e1d-6561-4068-bc1a-d6fa799e6849` passed; version `5db59362-a782-4d1a-a4d8-7afc3601e8da`, deployment `5ef9d84b-1d8d-4d96-a769-c6cc2b2b9308`, 100% traffic.
- Previous production versions retained for rollback: admin `e4b52446-ffc7-4732-ad92-9b9af162837e`; storefront `089033b8-cbfb-4bbc-838c-74961f7d590b`.
- No payment, customer notification, courier booking or stock mutation was performed during verification.
