# Dark storefront update

This updates the existing storefront, product pages, bag and checkout to the dark theme, corrected against the recovered 1 October desktop/mobile design boards. The original R03 horizontal logo contours are preserved, with a pale ivory-gold emblem (`#F3EBDD`) and white lettering. The mobile logo is compact. Catalogue photography and product names remain the real store assets; illustrative mockup products are not substituted for saleable products.

## Visual correction after review

The first implementation did not match the approved previews closely enough. This revision was compared directly with `Compact two-tone Vanta Noir storefront.png`, `Vanta Noir filter comparison: desktop and mobile.png`, and the mobile checkout board.

- Compact Shop for segments and two-column Collection choices replace long radio lists. Product type, Drop, Colour, Size and Price now expand individually.
- Filter and Sort controls sit together. Desktop opens the sidebar alongside the catalogue heading; mobile retains fixed Clear all / Apply filters actions.
- Mobile collections form one swipeable row. The compact mobile header has a functioning shop menu.
- Homepage desktop cards use the image/details side-by-side arrangement; catalogue cards remain vertical and mobile remains two columns. Pale-green View details buttons, shorter spacing and near-black surfaces follow the reference.
- Mobile checkout has an expandable order summary; country/state precede city/address, and code inputs have adjacent Apply buttons.

These are layout and interaction corrections, not a claim of pixel-identical generated photography. Review the new code-rendered screenshots before merging. No production deployment was performed.

## Shopping filters

The order is Shop for → Collection → Product type → Drop → Colour → Size → Price. Desktop filters start closed and open as a left sidebar. Mobile filters open in a full-screen panel with an independently scrollable body and fixed Clear all / Apply filters actions. Closing discards pending changes. Applied filters survive product navigation and return links.

Collections are shopper-facing edits: Streetwear, Activewear, Outerwear, Bottoms, Jerseys, Women, Essentials and Accessories. Existing admin product categories remain the product types. Collections can overlap (for example a women's jersey appears in Women and Jerseys); audience filters still match strictly. Women includes every item explicitly assigned to the women audience. Products with no audience retain the existing unisex fallback.

Drops come from named catalogue ranges and the existing merchant label overrides. Import batches and broad garment sections are not presented as drops. STEALTH is mapped to the original Stealth set; SHELL or VD are not assigned to unrelated products. Future named ranges can be assigned using existing collection fields/labels.

Real prices, colour variants, stock and sold-out states are preserved. Size chips use actual product sizes; missing XXL stock is not invented. Shipping, pre-discount reward eligibility, promotion codes, Paystack initialization and receipt verification are unchanged.

## Publish after merging

Target branch: `vanta-update-30`.

1. Back up the current Namecheap `public_html` files.
2. Upload `Vanta-Noir-Dark-Storefront-Update.zip` inside `public_html` and extract it there, replacing the matching HTML and asset files. The archive contains site files directly, with no enclosing folder. It preserves the existing `.htaccess` and `store-config.js`; it does not contain either file. Keep the existing product images and other files in place.
3. In Codespaces, after merging this PR, run:

   ```sh
   git pull --ff-only origin vanta-update-30
   npm ci
   npm run build
   npm run verify:release
   npm run deploy
   ```

   Run each command only after the previous command succeeds. No database migration is needed for this theme update.
4. Refresh the storefront and check the home page, Filters, a product page, bag and checkout. If an edge cache serves old HTML, purge that cache and refresh.

The provided ZIP is a storefront update for the existing installation, not a fresh full-site installation. To rebuild it, use `npm run build:storefront`; the full static export is in `outputs/namecheap`.

## Validation

- TypeScript checking and all 73 existing/new tests passed.
- Both the Cloudflare Worker build and static storefront build passed.
- Static verification covered 697 pages, 682 product specification pages and 25,143 local links/assets.
- Worker release verification passed catalogue import, CORS, admin authorization, R2 media and redirects.
- Browser verification used the repository catalogue with local API fixtures. It covered desktop sidebar visibility/order, eight collection tiles, independent product-type/deep-link preservation, mobile draft/cancel/apply/reset, and no horizontal overflow at 320, 390, 768 and 1440 pixels. Checkout/rewards layout was checked with one isolated sample stocked item. No payment was submitted and no production stock/settings were edited.

The screenshots are of the implemented code. Checkout screenshots use the isolated sample cart and reward quote, not a customer's live order.
