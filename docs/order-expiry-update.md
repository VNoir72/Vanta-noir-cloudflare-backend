# Order expiry and compact account update

Requested behavior: expire unpaid orders, consume the bag when payment begins, never restore expired/cancelled selections, keep waiting messages on the specific payment, provide removable order history, replace the header bag with notifications, and compact the account/orders layouts using the supplied references.

Implemented:
- Server expiry uses the provider's transfer deadline, with a 15-minute fallback. Read paths and reconciliation expire unpaid orders and release reservations. Payment initialization rejects expired references. Verified late payments enter paid_stock_review and do not silently allocate stock.
- Customer-owned history removal hides only that customer's listing. It retains transaction data and receipt access, with ownership checks.
- Website and mobile consume the selected bag at payment handoff. Website uses an order-scoped cleared marker; mobile migrates previously saved pending selections. No cancellation path restores selections.
- Expired payment views hide account details and waiting notices. Mobile payment polling uses a payment-local notice instead of the global banner. Receipt details settle before presentation and layout measurement no longer replays the animation.
- Header bell, separate search row, compact identity/order shortcuts, searchable order groups, item summaries, removal, and smaller spacing.

Validation: backend and storefront builds; backend release suite; customer-account isolation/removal and payment-hardening/expiry/late-payment integration tests; mocked browser checkout test including bag clearing, expiry, refresh and notification links; mobile TypeScript/lint and Android JS export; web-rendered mobile account/orders inspected with synthetic data.

Release status: owner approved the repository destination on October 10. Source pushed as 3ab7066d417815208b2372261f4143935d245fbd. Backend deployed at 2026-10-10T20:56:08Z, version 3e7de5b1-053a-4d8a-96df-56a1b0e64d85 at 100% traffic. Android preview build 4 submitted to Expo: https://expo.dev/accounts/vanta-noir/projects/vanta/builds/359e4249-b5dd-42c5-bc2d-dd0c0fa2ff75 (completion not yet verified). EAS built local commit 84849cb; its source tree 8cd40a254d00245f6387d3d539bf99e9f9ee7bab is identical to published commit 3ab7066. Website package: outputs/Vanta-Noir-Orders-Header-Update.zip (711 files; preserves existing product photos), for the owner to upload to Namecheap.
