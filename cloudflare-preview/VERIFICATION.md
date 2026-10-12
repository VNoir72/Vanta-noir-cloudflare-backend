# Cloudflare browsing preview — 2026-10-12

Preview: https://vanta-storefront-preview.the-geebola.workers.dev/

Source storefront: da3f1be9b8ebec80eee43f925cb8074daf6c19fa.
Deployed preview Worker version: 6c8755a4072449c4b752e4f5a9b1414a.
The live domain and Namecheap hosting were not changed.

## Verified

- Deployed 712 static files; public product photos load through a credential-free public API service binding.
- Live browser: current catalog loads; search for Apex Checker Cap returns the matching product.
- Quick shop loads imagery, colour and size options. Selecting One size enables Add to bag.
- Adding a Jet Black cap produces a bag line at NGN 30,000; quantity two updates subtotal to NGN 60,000.
- Checkout preserves the bag and displays the correct subtotal, address fields, and an explicit preview restriction. Payment remains disabled.
- Direct product URL renders the correct title, details and photos. All 13 rendered image elements inspected were loaded.
- Three adapter tests pass: write/admin/credential isolation; product publication checks and failure handling; legacy routes, missing pages and sitemap filtering.
- Worker syntax and Wrangler dry-run passed.

## Limits and remaining migration gates

This is a browsing preview, not a complete production acceptance test. POST/PUT/PATCH/DELETE and non-whitelisted APIs are blocked before reaching production. No orders, payments, messages or account changes were made.

Shipping quotes, payment callbacks, customer authentication, email delivery and native-app interactions remain unverified in this preview. Test these with isolated test credentials/data before live migration. Confirm production domain routing, authentication allowed origins, payment return URLs, caching and rollback before cutover.

Automated responsive browser suite could not launch: the Chromium download failed with an invalid/truncated archive. Desktop cloud-browser checks above succeeded; mobile/tablet rendering is not certified by this run.

## Reproduce

Build the existing Namecheap export first, then run `node cloudflare-preview/prepare.mjs` and `node --test tests/cloudflare-preview.test.mjs`. Review `cloudflare-preview/wrangler.jsonc` before deploying. Generated assets are build outputs; `env.d.ts` can be regenerated with Wrangler types.

Never attach this preview adapter directly to the production domain: it deliberately blocks account, shipping and order operations.
