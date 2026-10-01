# Checkout and animated receipt update

Prepared from `vanta-update-30` at `2c9453fd1b48caf398609a2e7490ceddf3b5f891` (1 October 2026, “Save current Vanta Noir storefront updates”).

The existing guest checkout now has the approved black, charcoal and green styling. The existing payment-verification flow renders a shopping-bag confirmation, followed by a thermal-printer receipt on request. The receipt uses the server's purchased items, colours, sizes, quantities, discount, shipping and charged total. Download produces a self-contained HTML receipt that can be printed or saved as PDF using the browser.

## Behaviour

- The receipt and success illustration require a paid response from the existing private verification API. A payment-reference URL alone does not unlock them.
- Pending, failed, inaccessible and mismatched-reference responses retain tracking/help and retry controls, without a paid receipt.
- Paid orders requiring stock review or marked cancelled show the existing review warning, including on the receipt download.
- The API's `subtotalKobo` is already discounted. The receipt restores the gross subtotal for display and shows the discount separately; it uses `totalKobo` from the server.
- Receipt downloads escape order text and contain no customer email, address or receipt-access token.
- The existing Paystack redirect, session token, analytics consent and cart clearing remain in place.
- Reduced-motion preferences suppress the printer movement. Styling is opt-in on checkout and payment completion; no catalogue, homepage, payment settings or database changes are included.

## Build and verification

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run verify:release
npm run build:storefront
npm run verify:storefront
```

The Namecheap build is in `outputs/namecheap`. `npm run deploy` publishes the Cloudflare backend and does **not** update the Namecheap storefront.

## Publish the checkout-only package

The companion `Vanta-Noir-Checkout-Receipt-Update.zip` contains only `checkout.html`, `checkout/complete.html`, and their new versioned JavaScript/CSS assets. It contains no credentials, demo orders, database changes, homepage, product pages or images.

1. In the existing Namecheap document root, back up `checkout.html` and `checkout/complete.html`.
2. Extract the package into that same document root (normally `public_html`), preserving the `checkout/` and `assets/` folders. Allow the two checkout HTML files to be replaced.
3. Keep the older asset files: the other existing pages still reference them.
4. Check `/checkout` on a phone and desktop. Complete a Paystack test-mode purchase in the established test environment, confirm the receipt and its total, and check its download on iPhone/iPad Safari. Never manufacture a successful production order just to view the receipt.

To roll back, restore the two backed-up HTML files. The additional versioned assets are harmless when unreferenced. No Worker deployment or database migration is required for this frontend-only update.

## Validation boundaries

Passed: TypeScript checking, all 59 automated tests (including five receipt tests), the frontend and backend builds, backend release verification, and storefront verification across 697 pages and 20,935 local links/assets. Chromium checks covered receipt download, discounted totals, checkout request contents, pending/failed/review/403/mismatched-reference states, missing references, reduced motion and no horizontal overflow from 320px to 1440px.

Automated tests use isolated test data, not real payments. Browser-engine checks do not replace a physical iPhone/iPad Safari check or a real test-mode Paystack checkout. Preparing source or a ZIP does not publish it to Namecheap.
