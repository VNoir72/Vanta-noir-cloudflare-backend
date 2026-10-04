# Quick Shop, motion and product readiness

## Changes

- Quick Shop has a non-scrolling header and a 44px close button. The product content scrolls separately within the dynamic viewport, accounting for safe areas. The layout uses two columns on tablets/desktops and one on phones.
- Nested image enlargement retains its own 44px close button and returns to Quick Shop.
- Shopping motion includes a soft modal entrance/exit, product-view fades, favourite-heart feedback, lime navigation underlines and an editorial entrance. Motion does not delay interaction; reduced-motion preferences disable these additions.
- Product studio includes a checklist for publishing, availability, approved price and stock on confirmed sizes. It reflects unsaved edits and explains why stock alone cannot release a preview.
- A product with no confirmed sizes says “Sizes to be confirmed” instead of “Sold out” and does not ask customers to select a nonexistent size for a restock alert.

## How to make a product purchasable

Open Products → edit the product:

1. Confirm Price (₦), then choose Approved selling price under Price approval.
2. Choose Ready stock under Availability for goods held in stock. Only use Preorder with confirmed timing.
3. In Colours, designs & stock, enter stock against each actual size and colour. Replace Size pending with a confirmed size; use One size only when accurate.
4. Set Store status to Published and save changes.
5. Refresh the storefront and select the exact colour and size that has stock. Checkout reservations may temporarily reduce available stock; store-wide order and payment settings also apply.

No production product status, price, stock or archive setting is changed by this release.

## Returns policy

`returns-policy-proposal-2026-10-04.md` is a proposal for owner review, not a published customer promise. Existing customer-facing policy text remains unchanged until the owner approves the operating commitments.

## Release boundary

The backend deploy updates product studio. The separately hosted Namecheap storefront requires the new ZIP to be uploaded/extracted into public_html, replacing matching files without deleting the folder. This environment cannot perform that hosting upload. Physical iPad Safari and live customer payments are not covered by simulated viewport tests.

## Validation

Typecheck, 93 automated tests (one local native-PHP check skipped), compiled Worker verification and 697-page static verification passed. Actual storefront browser checks passed at 390×844, 768×1024, 1024×768, 1194×834, 1366×1024 and 1722×1000: close remains visible after scroll, Escape dismisses, nested image closes back to Quick Shop, reduced motion disables animation and no horizontal overflow or console errors. Actual product studio checks passed for preview/proposed blockers despite stock and availability edits at phone/tablet widths.
