# Vanta Noir pre-launch audit — 8 October 2026

## Decision

**Do not treat this as an unconditional launch sign-off.** Code and isolated workflow verification are separate from production content, provider setup and physical sample approval. No live orders, inventory, product approvals, customer messages, charges or shipments were created by this audit.

## Fixes in this release

- Hero navigation stays visible on scroll, remains transparent while over the approved campaign, and becomes pearl Liquid Glass at the actual hero edge. Recalculates on resizing and when search removes the hero. Same-row mobile search and spread desktop links remain intact.
- Incoming collection links, including the hero button, scroll to their destination after the live catalogue loads. Previously a page reload could lose the anchor jump while the collection was still absent.
- Product entrance motion no longer clips the heart or Quick shop controls. Focus/pointer interaction stops the entrance without restarting it after image decoding. This fixes an intermittent lost click reproduced during the journey tests.
- Open-bag catalogue errors now offer **Retry bag**, retaining the stored bag instead of showing an endless loader.
- Customer-page headers reflect the saved bag and favourites; checkout reconciliation updates the count in the same tab.
- Payment verification has a bounded request timeout and recoverable retry instead of a potentially indefinite spinner. Purchase success still depends on server verification.
- Category tiles use an actual matching product. Empty categories/new-arrival/best-seller groups no longer borrow an unrelated garment image.
- Launch certification checks each colour's front/back/left/right references (or its specifically reviewed composite board), confirms measurements for every included garment section, and excludes inactive variants from sellable stock.
- Original garment artwork, anime graphics, decorative lettering, approved hero assets, current brand logos and admin control positions were preserved.

## Verification scope and evidence

| Area | Checks |
| --- | --- |
| Built customer journeys | 390, 820 and 1440 px: hero/scroll material, search empty state, save/favourites, Quick shop, size selection, add/increase/decrease/remove, bag return, free-shipping progress and unlock |
| Checkout | Missing destination gate; NG/US address switch and required postal code; invalid promotion; reward-service failure/retry; duplicate-safe checkout retry; mocked Paystack cancellation; verified receipt; return from receipt; guest tracking failure recovery |
| Payment transport | Deliberately stalled verification recovers after timeout; retry works; verified purchases clear the purchased quantity only |
| Admin | Section navigation and independent scrolling; opened mobile drawer; responsive breakpoints; unsaved edit protection; four image upload destinations and failed upload recovery; reviewed bulk-order confirmation and double-click lock |
| Staff | Six roles, permission boundaries, support enquiry retry, linked order lookup, shared chat, sales totals and safe network retry, guides and mobile layouts |
| Launch / manufacturing | Owner-only certify/launch, revision and stock-change conflict guards, missing specs/views/sizing blocks; real garment PDF with four distinct embedded images and two landscape sheets; failed-image print guard |
| Rendering / release | 45 route/viewport combinations; 697 generated pages; 21,653 local link/asset references; catalogue shells do not embed stale product data; current studio image mappings; compiled Worker/auth/CORS/R2 checks |
| Backend integration | Checkout totals, reservation conflicts, signed payment verification, idempotency, refunds/returns, support privacy, subscriptions, email retry, staff roles/approvals and courier sandbox behavior |
| Accessibility / resilience | Same-row search focus/Escape; keyboard card interaction; reduced motion; high-contrast solid-surface fallback; dark-device admin light theme; failed images; malformed settings; narrow viewports |

The new customer workflow, policy and entrance-motion checks now run in release CI, not only manually. The test payment window and services use dummy data; they do not prove a live Paystack charge or courier booking.

## Production findings requiring completion

1. **Storefront release mismatch.** The public Namecheap site still showed the older burgundy campaign during the live audit. The repository/build contains the approved black technical duo. Cloudflare backend deployment alone does not replace Namecheap frontend files. Upload the complete code-repair package, overwrite the existing files in the storefront root, then verify the live mobile/desktop view.
2. **Stock/readiness.** Production contained 682 published designs: 672 previews and 10 marked in stock. Eight of the 10 had no positive-stock active variants. The graphic tee had one L variant with stock 3. The socks had positive quantities only under `Size pending`, so they are not a launch-ready size offering. Review actual stock and sizes; the audit has not invented inventory.
3. **Live courier connection.** The saved Terminal live check from 7 October 2026 failed: “Terminal rejected the live credential. Check the live secret and account access.” The sandbox acceptance record was completed. Live booking is still disabled by the implementation; a sandbox pass must not be presented as a working live fulfilment integration. Confirm a working manual fulfilment process or complete live courier setup before promising delivery.
4. **Manufacturing and certification.** All published products had gallery records, but 681 size guides were `reference` and one lacked a guide status. No product launch-certification rows were saved. Ten older products already marked for sale predate the certification workflow; this audit did not withdraw or certify them automatically. Review them before sale. Technical packs remain sampling/reference documents until actual measurements, materials, stitching, tolerances, artwork and fit/sample approvals are confirmed.
5. **Authenticated production UI.** Live admin access reached Cloudflare Access email-code sign-in. Admin workflow checks used the real application components with isolated dummy services, and compiled server tests checked authorization. They are not a substitute for an authenticated production walk-through.
6. **External outcomes.** No live payment was charged, message sent or paid shipment booked. Provider credentials were not read. Existing email-outbox records were all marked sent (41), which is historical status rather than a new delivery test. Browser checks ran in Chromium at mobile/tablet/desktop dimensions; physical iOS Safari testing is not claimed.

## Live checks performed

Public storefront load, search and result navigation, save/favourites, preview Quick shop, nested size guide, cm/inches conversion, dialog return and About navigation. The preview tested correctly hid its price and blocked adding it to the bag. Live admin sign-in protection remained in place. Production configuration and catalogue readiness were inspected read-only through the connected infrastructure service.

## Release operation

Merge only after the isolated release gate succeeds. Deploy the verified Worker version to the existing production Worker. Deliver the Namecheap code-repair archive separately; do not claim that providing an archive updated the public storefront. Retain the workflow results and preview images with the release.
