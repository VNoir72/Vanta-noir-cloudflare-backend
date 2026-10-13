# Release checkpoint — 2026-10-13

Source release: `f64cd5c870fc49920c6859ac413ce460a19213ab` on
`codex/cloudflare-storefront-preview-2026-10-12`. Its tree matches the locally
tested merge (`a15aea504617dba42214720bf6d3393b6955b2a9`).

## Included and checked

- Preserve the existing Circle payment verification, in-app checkout, pending
  payment recovery and membership presentation changes.
- Preserve compact Bag, address editing through the pencil button, and approved
  pale-gold master emblem with reduced-motion support.
- Correct promotion/reward usage queries to count `payment_status='paid'` while
  fulfilment progresses to `processing`. Keep stock-review safeguards.
- Add consent-aware native product, add-to-bag, checkout and payment-method
  events. Record verified paid purchases once per reference on the device;
  exclude contact data and separate merchandise value from shipping.
- Reconcile the existing CRM/automation branch without dropping newer payment
  changes. All six required CRM tables were confirmed on the live database.
- Live paid orders inspected on October 13: processing 1, shipped 1, delivered 6;
  none remained at fulfilment status `paid`. No orders were modified for this check.

Local backend typecheck/build and mobile typecheck/lint passed. Focused payment,
Circle, customer, CRM/automation and analytics tests passed (7 tests), along with
the App Check cache tests (2 tests).

## Running release jobs

- Expo Android APK: `bcb1b0e5-d960-4a37-9fc9-a92d23b96924`, version 0.1.13 (25),
  production-apk, source f64cd5c. Automatic store submission is off.
- Cloudflare initial job `a34469c6-2e01-4e23-a73a-f0f5e1560749` exposed missing
  mobile dependencies in the existing build pipeline. The pipeline now installs
  mobile dependencies and runs its postinstall, typecheck and lint before the
  full existing backend test/build/release-verification sequence.
- Corrected Cloudflare job: `7043a914-4dcc-49e0-9d96-dfd88d28cbc2`.
  This uploads a Worker version; production promotion still requires checking
  the completed job and uploaded version. Do not describe it as deployed yet.

## Not complete

- Delivery-number OTP enforcement and re-verification on a changed delivery
  number. Existing optional profile OTP support uses Termii, but the live Worker
  has no Termii credentials. No SMS was sent or provider credit purchased.
- Customer authenticator MFA enrolment/recovery and admin MFA rollout.
- Website push registration/service worker/delivery and VAPID setup.
- Website/iOS App Check setup and end-to-end device verification.
- iOS signing/APNs/build: Apple Developer access is not available yet.
- Real-device confirmation of Android push, analytics event arrival, and the
  repaired Circle/payment journey after installing the completed APK.

No Play Store or App Store publication was requested or performed. A GitHub push,
successful unit test, or queued build is not proof of a production deployment,
installed app, delivered notification, or activated membership.
