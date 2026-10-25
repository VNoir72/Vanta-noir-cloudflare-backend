# Customer account and preorder checkout repair — 2026-10-25

The customer account now has a focused overview, compact navigation, order status shortcuts, saved pieces, delivery addresses, offers and reviews. Less frequent preferences live in one expandable section. Desktop uses a sidebar; narrow screens use a horizontally scrollable navigation strip. Existing customer sign-in, verification, authenticator challenges and shared app account behaviour remain intact.

The current catalogue starts fetching while the application downloads, is consumed once, and is discarded after 15 seconds. It is never persisted as stock. Transient failures retry once within a 16-second overall budget instead of two 20-second waits. Incomplete app-preview responses no longer crash the page.

Preorder dispatch promises appear in checkout. New orders save an atomic snapshot in store_meta alongside the order and reservations, with no schema migration. That original promise appears in customer history, guest tracking data, payment confirmation, downloadable and on-screen receipts, confirmation emails, and admin order details. Product edits cannot silently rewrite an existing order's promise. Older orders have no invented historical promise.

## Validation

- Final full suite: 311 tests, 310 passed, one existing skip, zero failures.
- TypeScript check passed.
- Compiled backend verification passed, including protected admin routes, stock, customer enquiry, CORS, permissions, R2 access and dashboard queries.
- Static verification passed: 698 pages, 25,854 local links/assets, privacy-safe product shells, security checks and startup bundle budget.
- Desktop and 390-pixel responsive Chromium UI inspected with a dummy customer. Orders navigation works without repeating the overview. This is not a real iPhone/Safari device test.
- Dummy preorder: live-code quote creation, changed-address/bag rejection, capacity reservation, payment deduplication, immutable dispatch promise, customer receipt/email, admin detail, shipped/delivered tracking and wrong-customer rejection.
- Courier tests cover insufficient wallet response, cached addresses, domestic/international quotes, parcel changes, signature verification, wrong recipient, unpaid order rejection, duplicate and out-of-order callbacks.
- Receipt HTML escapes preorder text. Incomplete app preview responses are tested against blank-page failure.

All dummy commerce records used disposable Miniflare D1 databases, destroyed in finally blocks. Payment, email and courier outbound requests were intercepted fixtures; no real messages, charges, bookings, stock additions or test customers were written to production. Temporary local browser fixtures are excluded from the release.

Deployment retains existing Cloudflare assets, bindings and secrets. Image binaries did not change; final release builds regenerated application code and text assets without re-encoding the existing image library. Cloudflare admin email-code sign-in and owner-controlled MFA enforcement are unchanged.

## Remaining real-world verification

A funded courier account and a real parcel are still needed to prove a paid pickup and delivery. Dummy tests cannot establish that. Actual product measurements/manufacturing specifications and a physical Safari device cannot be fabricated. No dummy facts were retained as live product information.
