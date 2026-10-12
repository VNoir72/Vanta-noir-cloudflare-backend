# Customer experience correction review

## Confirmed defects and corrections

- Live hero height was collapsed by an older CSS override; explicit responsive stage dimensions restore it. Featured selection now includes eligible published featured previews and previously sold products instead of reusing the narrower merchandising list.
- Desktop gallery thumbnails were forced into four columns inside a narrow sidebar. Desktop now uses one thumbnail column; smaller screens use a four-thumbnail row with landscape and zoom bounds.
- Website account now has profile, contact phone, saved addresses, orders, password reset and sign-out. An order fetch failure does not hide settings.
- App and website sign-in use compact centered Google and email/password forms. Email-code sign-in UI was removed, while existing backend verification used by older clients/account deletion remains compatible.
- Incomplete profiles request name and phone. Phone is contact information, not SMS-verified identity. The backend stores phone per customer and preserves it for older clients.
- Featured garments remove edge-connected neutral backgrounds and crop to visible bounds. Admin can supply a transparent PNG/WebP override for photographs that cannot be reliably segmented automatically.

## Evidence

- Unit/integration suite: 234 tests, 233 passed, zero failed, one PHP-runtime-dependent test skipped.
- Compiled backend release verification passed, including protected admin, invalid authentication, customer support, R2, CORS, field-save concurrency and dashboard calculations.
- Native TypeScript and Expo lint passed; no EAS build was started.
- Static website: 698 pages and 25,171 local references verified; 682 privacy-safe product shells and 3,724 delivery photographs verified.
- Actual UI components in isolated sample-data browser fixture checked at 390x844, 844x390, 768x1024, 1024x768 and 1280x900. Gallery, account settings, native sign-in rendered via React Native Web, and admin editor had no horizontal overflow. Thumbnail selection, zoom close after rotation, carousel pause/slide controls, and admin Edit/Add/Cancel were exercised.
- Account component tests cover order-load failure, failed and successful profile saves, address cancellation, sign-out and Google profile completion.

## Release boundary and remaining checks

The preview uses sample data and does not perform real authentication or payments. Browser-size checks are not physical Android/iPad/Safari tests. Real-device Google authentication, keyboard behavior, App Check and payment-provider completion still require end-to-end verification. Do not start a paid EAS build as a substitute for those checks.

The website ZIP must be installed on Namecheap; a Cloudflare backend deployment alone does not replace the live static frontend. This review does not assert that production has been updated.

Firebase appears during Google sign-in because the configured auth domain is vanta-noir.firebaseapp.com. A branded auth domain requires Firebase Hosting/custom-domain and OAuth redirect configuration; changing only the frontend string would risk breaking login. SMS OTP is not enabled.
