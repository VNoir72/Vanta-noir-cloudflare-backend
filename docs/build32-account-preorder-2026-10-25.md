# Build 32 account and preorder update

The customer app's You page now groups profile, order status, shopping shortcuts, account preferences, membership and support. Offers and review requests show loading and retry states instead of treating unavailable data as an empty account. Notification history tolerates malformed local data and reports persistence errors.

Order-history failures no longer prevent saved-card refresh and pending-payment restoration. The Orders screen and account overview expose a retry action and identify stale data. Account-specific component state resets when the signed-in customer changes.

Preorder dispatch details appear on product details and checkout, and saved order promises appear in order history, tracking, virtual receipts and exported PDFs. Existing orders without saved promises do not gain invented dispatch dates. PDFs escape the dispatch text. This uses the preorder fields already deployed in the backend on 2026-10-25.

## Validation

- TypeScript and Expo lint pass.
- All 41 mobile tests pass, including dummy mixed-cart preorder mapping, corrupt account data, notification storage, escaped PDF promises and pending-payment recovery during an order-history outage.
- Browser rendering of the actual YouPage with React Native Web and isolated dummy services checked at 390px/light and 320px/dark/error. Profile callback and review modal checked. Narrow buttons remain within the screen. This is not a physical Android device test.
- Android fingerprint matches build 32: `9829b16b33975c503904e03aebd352fa673a78ca`.
- No package, lockfile, app config, EAS build profile or native dependency changes. Shared accent helper brought into parity with the already-existing mobile helper so the complete regression suite can run in EAS.
- Dummy data stayed in local fixtures; no production accounts, orders, inventory, shipments, payments or messages were created.

## Release

Use the existing Expo `android-design.yml` workflow on this branch, with channel `production` and `APP_VARIANT=customer`. The pre-update hook checks the exact build 32 fingerprint, types, lint and all mobile tests before publishing. No new binary is required. The existing background updater downloads quietly and applies on a subsequent normal launch; do not force a reload during shopping or payment.

Publication identifiers and verified result are recorded separately after the EAS workflow completes. Do not infer installation on a user's phone from workflow success alone.
