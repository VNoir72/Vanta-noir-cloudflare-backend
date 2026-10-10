# Order expiry and compact account update

Requested behavior: expire unpaid orders, consume the bag when payment begins, never restore expired/cancelled selections, keep waiting messages on the specific payment, provide removable order history, replace the header bag with notifications, and compact the account/orders layouts using the supplied references.

Implemented:
- Server expiry uses the provider's transfer deadline, with a 15-minute fallback. Read paths and reconciliation expire unpaid orders and release reservations. Payment initialization rejects expired references. Verified late payments enter paid_stock_review and do not silently allocate stock.
- Customer-owned history removal hides only that customer's listing. It retains transaction data and receipt access, with ownership checks.
- Website and mobile consume the selected bag at payment handoff. Website uses an order-scoped cleared marker; mobile migrates previously saved pending selections. No cancellation path restores selections.
- Expired payment views hide account details and waiting notices. Mobile payment polling uses a payment-local notice instead of the global banner. Receipt details settle before presentation and layout measurement no longer replays the animation.
- Header bell, separate search row, compact identity/order shortcuts, searchable order groups, item summaries, removal, and smaller spacing.

Validation: backend and storefront builds; backend release suite; customer-account isolation/removal and payment-hardening/expiry/late-payment integration tests; mocked browser checkout test including bag clearing, expiry, refresh and notification links; mobile TypeScript/lint and Android JS export; web-rendered mobile account/orders inspected with synthetic data.

Release status: this update is prepared locally, not deployed to production or an installable Android build. Existing October 10 worldwide-shipping backend deployment remains live. Remote GitHub write is pending explicit destination approval after automatic approval review rejected a previous write. Website package: outputs/Vanta-Noir-Orders-Header-Update.zip (711 files; preserves existing product photos).
