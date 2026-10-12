# Cloudflare browsing preview — 2026-10-12

Preview: https://vanta-storefront-preview.the-geebola.workers.dev/

Source storefront: da3f1be9b8ebec80eee43f925cb8074daf6c19fa.
Deployed preview Worker version: 32dbd76e93a745c7a26174ccb7b8010d.
The live domain and Namecheap hosting were not changed.

## Verified

- Deployed 712 static files; public product photos load through a credential-free public API service binding.
- Live browser: current catalog loads; search for Apex Checker Cap returns the matching product.
- Quick shop loads imagery, colour and size options. Selecting One size enables Add to bag.
- Adding a Jet Black cap produces a bag line at NGN 30,000; quantity two updates subtotal to NGN 60,000.
- Checkout preserves the bag and displays the correct subtotal, address fields, and an explicit preview restriction. Payment remains disabled.
- Direct product URL renders the correct title, details and photos. All 13 rendered image elements inspected were loaded.
- Four adapter tests pass: write/admin/credential isolation; product publication checks and failure handling; legacy routes, missing pages and sitemap filtering.
- Worker syntax and Wrangler dry-run passed.

## Limits and remaining migration gates

This is a browsing preview, not a complete production acceptance test. POST/PUT/PATCH/DELETE and non-whitelisted APIs are blocked before reaching production. No orders, payments, messages or account changes were made.

Shipping quotes, payment callbacks, customer authentication, email delivery and native-app interactions remain unverified in this preview. Test these with isolated test credentials/data before live migration. Confirm production domain routing, authentication allowed origins, payment return URLs, caching and rollback before cutover.

The original Playwright Chromium download failed. A separate @sparticuz/chromium 153 package supplied the test binary. Phone/tablet tests now run against the exact exported preview assets with local fixture APIs. This is Chromium touch emulation, not a physical iPhone/iPad or Safari certification.

## Reproduce

Build the existing Namecheap export first, then run `node cloudflare-preview/prepare.mjs` and `node --test tests/cloudflare-preview.test.mjs`. Review `cloudflare-preview/wrangler.jsonc` before deploying. Generated assets are build outputs; `env.d.ts` can be regenerated with Wrangler types.

Never attach this preview adapter directly to the production domain: it deliberately blocks account, shipping and order operations.

## PHP migration review

The only application PHP file found is `portable/storefront-gateway.php`. It performs publication checks, dynamic product metadata/structured data, and sitemap filtering. Payment, database and account logic already live in the Cloudflare backend.

Executed the unmodified gateway in PHP 8.3.33 via PHP.wasm: all nine request checks passed, including published/unpublished variants, escaping, schema JSON safety, outage handling, mismatched products, sitemap filtering and invalid paths. Upstream responses were fixtures; this does not certify Namecheap Apache/cURL configuration.

The Worker replaces these gateway responsibilities; no PHP interpreter or Apache `.htaccess` is used in the preview. Fixed two migration discrepancies: canonical/og:url product metadata and ordering of the retired-hero redirect before generic image forwarding. The deployed canonical was verified in the cloud browser. Preview noindex and blocked writes remain intentional. Production HTTPS/www redirects, admin-link behavior and caching still require production-specific configuration before cutover.

## Responsive test reproduction

`CHROMIUM_EXECUTABLE=/path/to/chromium node tests/browser/cloudflare-preview-responsive.cjs`

Nine portrait dimensions and their landscape reversals: 320×568, 375×812, 390×844, 430×932, 744×1133, 768×1024, 820×1180, 834×1194, 1024×1366. Touch enabled, device scale 2. Checks use current exported HTML/CSS/JS, a fixture catalog with stock and disabled payments, and deny nonessential API calls. The initial fixture harness returned invalid app-preview JSON; this was corrected to match the preview's blocked response. Entrance animations are allowed to finish before checking settled dialog bounds.

## Completed responsive results

PASS: 18 portrait/landscape layouts for header and inline search, checkout, and full product details. Filters, quick shop and a populated bag each passed 54 repeated viewport changes (162 overlay checks total). No document horizontal overflow in tested states, all checked dialogs remained within the viewport after entrance animation, quick-shop close remained reachable, and no browser runtime errors were recorded. Product size selection and Add to bag succeeded before bag/checkout checks.

All tests use Chromium touch emulation and local fixture APIs. They do not verify mobile Safari keyboard behavior, real-device rotation, live shipping quotes, authentication, or payment completion.
