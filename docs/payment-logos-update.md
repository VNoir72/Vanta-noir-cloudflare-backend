# Payment acceptance marks — 1 October 2026

Adds a shared payment-method strip to the storefront footer and beneath the checkout payment button. It shows Apple Pay, Visa and Mastercard marks, with text for Verve, bank transfer and USSD. The Apple Pay note explains that availability depends on the customer's device and card.

The owner's Paystack screenshot showed Card, Apple Pay, Bank, Bank Transfer, USSD, PayAttitude and international payments selected. Google Pay and American Express were unchecked, so they are not advertised in this update. Their marks can be added after activation is confirmed.

These are acceptance marks, not payment buttons. Checkout still redirects to Paystack, where the customer chooses from the available methods. No credentials, payment routes, shipping rates, promotions or launch settings are changed. The marks do not independently activate payment channels or verify Apple Pay domain setup.

Assets are served locally. Apple Pay uses the unmodified official Apple artwork. Visa and Mastercard use unmodified Datatrans payment-logos assets. Sources and licensing are included in `public/images/payments/CREDITS.txt` and `LICENSE-datatrans.txt`.

## Validation

- TypeScript passed.
- Storefront build passed.
- Static verification passed: 697 pages, 25,117 local links/assets, 682 product pages, checkout routes and hosting rules.
- SVG files parse successfully and contain no scripts or event-handler attributes.
- Browser screenshot verification could not run because the local browser process was blocked by the execution environment. Responsive layout uses a wrapping flex row with fixed-size, aspect-preserving marks; check the final layout on iPad/phone after upload.

## Publishing

Merge into `vanta-update-30` to preserve these changes in source control.

The prepared `Vanta-Noir-Payment-Logos-Storefront-Update.zip` contains all generated storefront HTML, the matching JavaScript/CSS assets, and payment marks/credits. It also includes the earlier sold-out, checkout and receipt updates. Upload it to Namecheap `public_html`, extract there, and replace matching files. Keep existing product images, `store-config.js` and hosting configuration. The ZIP deliberately excludes those existing files.

This is a storefront display update; a Cloudflare backend deployment is not required for the Namecheap site to show the logos. No production payment was submitted during verification.
