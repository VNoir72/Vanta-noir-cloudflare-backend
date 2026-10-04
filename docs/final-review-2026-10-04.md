# Vanta Noir — final review for owner approval

Prepared 4 October 2026 against commit a519729ba3f256d2f36535a18691aaebe5a71cf1 on local branch `codex/final-review-local-2026-10-04`.

**These changes are local. Nothing has been pushed or deployed. No production images, customer records, subscriptions or Cloudflare configuration have been changed.**

## Changes prepared

| Area | Before | Prepared change and reason |
|---|---|---|
| Admin field help | Native help dialog could conflict with the editor dialog; help buttons lived inside field labels. | Uses the shared accessible dialog component, puts help buttons outside labels, restores focus, scopes Escape to help, and prevents Got it from submitting the form or closing the editor. |
| Store filters | Selecting a filter immediately changed products. | Selections remain pending until **Apply filters**. Closing or pressing Escape discards pending changes. Clear all clears the pending selection and still needs Apply. |
| Checkout appearance | Dark checkout did not match the approved product views. | White surfaces, readable dark text, neutral borders, lime **#c6f276** actions and coordinated focus states. Keeps the receipt illustration. |
| Motion | Inconsistent general transitions. | Short button press feedback and gentle product-image hover on devices that support hover. Honors reduced-motion preferences. Avoids heavy animation dependencies or autoplay effects. |
| Catalogue requests | Repeated tab refocusing could trigger redundant full catalogue requests. | Refocus refresh is limited to once per minute. Checkout still validates live prices and stock on the server. |
| Scheduled release alerts | Full catalogue could be read when no release campaigns were pending. | Checks for pending campaigns first and avoids that catalogue read when idle. Does not slow the maintenance schedule. |
| Homepage search copy | Generic title and description. | Clear Nigeria streetwear/activewear title and natural product terms matching the range: oversized tees, hoodie sets, baggy joggers, jerseys, outerwear and accessories. |
| Product search markup | Live publication gateway lacked product structured data. | Adds publication-checked Product/Offer markup with NGN pricing and reservation-aware stock. Preview/proposed-price products have no sale offer. Encodes JSON safely in HTML. |
| Privacy and terms | Some disclosures and rights wording were incomplete. | Clarifies role-based staff access, digital mockups and preview items; adds qualified privacy rights and an NDPC complaint link. Does not invent return promises or claim legal compliance is guaranteed. |
| Code cleanup | Three unused starter icons remained. | Removes file.svg, globe.svg and window.svg after checking source references. Keeps operational scripts, historical repair records and dependencies whose removal was not proven safe. |
| Regression tests | Search markup was not checked; PHP-unavailable gateway test could hang. | Adds live-stock/preview markup regression coverage; explicitly skips gateway integration when PHP is unavailable and safely tears down its server. |

## Important owner decisions / limitations

1. **Returns policy is a launch blocker for real customers.** Production settings had acceptingOrders and inventoryConfirmed enabled, but the saved policy was: “Currently testing check out. No goods shipped”. Replace it with your actual returns/exchanges/refund terms, eligibility, contact/process and timing before accepting real purchases. The payment environment was not inspected for secrets or changed. No invented policy has been substituted.
2. Confirm dispatch promises, actual product availability, product photography/mockup disclosures, business/contact information and rights to all designs/images. Code changes alone cannot establish these facts or remove every legal risk. Nigerian consumer obligations cannot simply be disclaimed away.
3. **Do not downgrade Cloudflare yet.** Recent D1 reads exceed the free daily allowance. The local optimizations need production measurement after an approved deployment, and free-tier CPU compatibility remains unproven.
4. No real payment, refund, customer email, courier shipment or production admin mutation was performed. Local isolated tests exercise these code paths without affecting customers.
5. PHP gateway execution is now verified using portable PHP 8.3.33 (PHP.wasm): nine request scenarios passed against the unmodified gateway. The upstream API was simulated, as in the native integration test. Namecheap’s actual PHP/Apache configuration and live outbound network remain deployment-specific checks.

## Verification and scope

- TypeScript typecheck: passed.
- Automated suite: **94 tests, 93 passed, 0 failed, 1 skipped** (native PHP runtime unavailable).
- Follow-up PHP verification: **9 request scenarios passed in portable PHP 8.3.33**, covering the skipped gateway behavior plus safe Product JSON-LD encoding, mismatched-product handling and invalid URLs. No application dependencies or hosting configuration were changed. Reproduce with the instructions in `scripts/verify-php-wasm.mjs`; the runner uses a temporary runtime installation.
- Browser checks at **390, 1194 and 1722 px**: pending filter selections, cancel/Escape, Apply, checkout palette and form, repeated help dismissal outside and inside an editor, Escape behavior, no accidental submit and retained field values.
- Customer routes checked for headings, horizontal overflow and JavaScript errors: contact, help centre, about, privacy, terms, shipping/returns, privacy choices and reviews.
- Actual admin UI against isolated worker/database: all **16 navigation sections** opened without JavaScript errors. The product editor had 41 generated help buttons; eight were exercised in the editor in addition to the repeated focused regression fixture.
- Existing integration coverage includes checkout validation, stock reservations, payment idempotency/reconciliation, private receipts, CORS, authorization, staff approval/rejection and stale/concurrent edits, catalogue visibility, returns, tracking, dashboard calculations and uploads.
- Final backend and storefront production builds: passed.
- Compiled-worker release verification: passed, including dashboard calculations, staff permissions, JWT authorization, catalogue import, CORS, R2 upload/read/cache and storefront redirect.
- Static storefront verification: passed for **697 rendered pages and 19,676 local links/assets**, 682 privacy-safe product shells, host security rules and delivery files for 3,724 photograph mappings.
- Git whitespace/error check: passed.

This is substantial regression coverage, **not a claim that every possible button/state/browser combination or external integration has been exhaustively tested**.

## Cloudflare cost audit

Read-only snapshot, 4 October 2026. Usage includes development/import activity and is not a traffic forecast.

| Resource | Observed | Free allowance / implication |
|---|---:|---|
| D1 database storage | About 10 MB | 5 GB total storage: comfortably below. |
| D1 rows read on 1 October | 5,052,406 | 5 million/day: exceeded. |
| D1 rows read on 4 October | 18,091,967 | Exceeded well before the end of the day; later audit queries also consume reads. |
| D1 rows written on 4 October | 38,582 | Below 100,000/day. |
| Worker requests on 4 October | 1,374 | Below 100,000/day; request count does not prove CPU suitability. |
| Worker CPU on free plan | Not validated | Free plan allows 10 ms CPU per invocation; paid compatibility does not imply free compatibility. |
| R2 objects/storage | 305 objects / 35,282,212 bytes | Far below 10 GB-month standard storage allowance. |
| R2 month-to-date operations | 308 PutObject, 178 ListObjects, 26 HeadBucket, 561 GetObject | Far below 1 million Class A / 10 million Class B monthly allowances. |

The worker uses D1 and R2 and runs maintenance every five minutes. Removing either binding or blindly slowing maintenance could harm inventory, payments, alerts or media. The prepared idle-campaign and catalogue-refocus changes reduce avoidable work without removing those functions. After deployment, measure several representative days, including busy/admin days, before any downgrade. Keep the paid plan until reads and per-invocation CPU meet free limits with headroom.

### Gallery cleanup

84 R2 objects, totalling **6,383,388 bytes (about 6.4 MB)**, were not referenced by the current database fields checked. All still have references in tracked repair/rollback history. They have therefore **not been deleted**. The exact candidate inventory is in `cleanup-candidates-2026-10-04.json`. Recheck current references, preserve recovery copies and obtain deletion approval before removing them. This small storage saving will not resolve the D1 read limit.

## SEO research and legal sources

Public search results support relevant shopping language, but do not establish “most searched” terms or reliable search volume. No Search Console or Keyword Planner account was available. The prepared wording is a relevance improvement, not a promise of rankings, wealthy visitors or sales. Product markup must remain consistent with visible products and actual stock; no fabricated ratings or popularity claims were added.

- Google ecommerce guidance: https://developers.google.com/search/docs/specialty/ecommerce
- Google product structured data: https://developers.google.com/search/docs/appearance/structured-data/product
- Nigeria consumer rights: https://fccpc.gov.ng/consumers/consumer-rights-responsibilities/rights-responsibilities/
- Nigeria Data Protection Commission: https://ndpc.gov.ng/
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/

## Approval boundary

Owner review is required before any push or deployment. Cloudflare downgrade, production gallery deletion and replacement of the business returns policy are separate decisions; none is bundled into these local changes.
