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
- Browser visual inspection was blocked: cloud-browser security policy disallows local file previews. No screenshot acceptance or physical iPad/mobile verification is claimed.
- Production packaging results recorded in the delivery response. No live deployment or Android rebuild is implied by this source revision.
