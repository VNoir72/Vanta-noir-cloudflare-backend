# Vanta Noir app — first implementation, not store-approved

Customer app: native React Native/Expo 57 interface. Studio: separate build variant containing the existing protected admin in a WebView; this is not a rewrite of the administration UI. Both belong to Vanta Noir's existing repository. Native customer endpoints are deployed; no app-store submission has been performed.

## Implemented
- Customer catalogue from the API (no seeded sale stock), search, audience filters and preview-design protection.
- Existing approved logo and server-configured current hero; pearl/lime surfaces, iOS blur with reduced-transparency fallback; readable opaque fallback elsewhere.
- Product image selector, colours, sizes, product details and size guide; persistent bag and saved designs; product interest goes to the current backend.
- Email-code customer accounts, server-enforced order ownership, native Keychain/Keystore sessions, logout, saved address/profile, account deletion requiring recent verification.
- Customer order history/receipts and native Help, support ticket and policy pages. Guest order tracking still opens the website.
- Shipping quote selection and server totals with reward codes (including existing ZEROKADUNA eligibility). Checkout supports the server-enabled destination list and NGN; live quotes select the cheapest eligible courier automatically.
- Branded bank-transfer instructions, copy account number, payment verification and confirmation receipt. No hosted payment form is opened by the native customer app. No card details collected.
- Website custom transfer component behind CUSTOM_TRANSFER_ENABLED, retaining the existing checkout until enabled.
- Shared payment initialization lock across hosted and custom flows; repeat requests and ambiguous upstream outcomes cannot automatically create duplicate charges.
- Studio keeps Cloudflare Access and existing server-side owner/staff permissions. Never use the customer bearer token for admin access.

## Run locally
From mobile/: npm ci, npm run start. APP_VARIANT=studio npm run start selects Studio. Web export is a preview, not an installable native app. Native exports are JavaScript/Hermes bundles, not APK/IPA files.

## Backend rollout and remaining verification
1. Apply drizzle/0017_customer_app.sql in staging.
2. Deploy this branch to a staging backend. Configure existing Resend and Paystack TEST keys there. Set CUSTOMER_APP_ENABLED=true and CUSTOM_TRANSFER_ENABLED=true only in staging initially.
3. Set EXPO_PUBLIC_API_URL to that HTTPS staging origin before building. Add the preview web origin to the existing CORS allowlist only if web QA is required; native requests don't require broad CORS.
4. Test real email delivery and account recovery, native auth persistence/logout/deletion, transfer account creation and expiry, under/overpayments, interrupted payment, paid/failed receipts, and stock reconciliation with provider test fixtures. Unit tests use mocked upstream responses only.
5. Verify Paystack permits the custom Pay with Transfer channel on the merchant's live account and confirm any fees/customer disclosures. Do not claim support approval from documentation alone.
6. Production migration and native endpoint deployment were completed on 10 October 2026. The live flags are enabled; end-to-end live verification remains outstanding. The existing hosted website checkout was preserved.

## Signing / distribution
App identifiers proposed: store.vantanoir.shop and store.vantanoir.studio. Confirm these are available and owned before signing. EAS profiles exist for customer/studio internal previews and production. Customer is linked to Expo owner vanta-noir, slug vanta, project fa2d496b-dfe1-490c-9c6c-c1d961442dd6. The GitHub build base directory must be mobile and branch codex/native-app-2026-10-10. Studio still requires its own separate EAS project ID; never reuse the customer project ID for Studio.

Use EAS signing with the owner's Apple/Google developer accounts. The customer app has an EAS-managed Android signing key and successful internal APK builds. No IPA or store submission has been produced. Apple developer enrollment is deferred. iOS internal distribution requires registered devices/ad-hoc provisioning or TestFlight as applicable. Decide the private staff distribution method before shipping Studio.

## Required before release
- Physical-device QA on supported Android, iPhone and iPad, including rotation, large text, VoiceOver/TalkBack, keyboard, Android back, expired sessions, weak/offline network, interruptions and persistent close controls. Bundle compilation is not device testing.
- Expo/Apple/Google account setup, icons and launch screens using the approved master artwork, store screenshots, support URLs, rating/content declarations, app review instructions and reviewer test account.
- Company spelling/registration and launch markets confirmed; privacy/terms/refund review by qualified counsel. Publish exact data retention periods and third-party processors, cross-border processing, user rights and marketing choices; assess Nigerian and destination-market obligations.
- External deletion route is deployed at https://api.vantanoir.store/api/customer/delete-account. It must be live and tested before entering it in Play Console. The deletion flow must be reviewed against the published retention policy.
- Complete Apple privacy/Google Data safety forms from actual installed SDK behaviour; audit production manifests, dependencies and permissions. Existing policies have not been certified to cover this new app.
- Push notifications are NOT implemented in this first build. Device tokens, consent/preferences, APNs/FCM credentials, dispatch/delivery receipts and notification deep links remain to build and test.
- Cross-device bag sync, social sign-in, biometric unlock and a dedicated return-request form are NOT included. Email-code accounts, a local persistent bag and native support enquiries (including return enquiries) are implemented.
- Full custom card checkout is BLOCKED pending Paystack eligibility and PCI DSS requirements. Do not insert raw card fields or hide/rebrand hosted Paystack UI. Bank authentication screens cannot be branded by Vanta Noir.
- Root website has not been repackaged for Namecheap from this branch; the previous working ZIP remains the live-upload package until this release is validated.

## Paystack support request to be sent by the owner
Please confirm that our Nigerian Vanta Noir merchant account can use the Charge API's Pay with Transfer channel with a fully merchant-designed website and mobile payment screen. Please confirm account eligibility, expiry behaviour, fees (including any customer-paid fees), required branding/disclosures, webhook events and the production acceptance checks. We want Paystack-owned card fields embedded inside our branded Vanta Noir React Native/Expo page, without the Paystack popup or hosted checkout page. Please provide the supported SDK/API and documentation, merchant eligibility, compliance requirements, saved-card tokenization support and mandatory bank-authentication flow. We do not want to collect raw card details on our server. If only a payment sheet is supported, please confirm that limitation explicitly.


## Android 0.1.1 integration update (10 October 2026)

Native help, contact ticket submission, policy pages, grouped Nigerian address entry with a state selector and validation, address-book editing, checkout address/item review and pinned payment action are implemented. Terms and privacy text are reproduced from the store with native account/storage disclosures. Update the bundled policy text when the published policies change.

The customer account D1 tables and native endpoint overlay are deployed to vanta-noir-api. CUSTOMER_APP_ENABLED and CUSTOM_TRANSFER_ENABLED are true. The current deployed storefront/admin bundle and hosted guest checkout were preserved. Live email delivery, live bank-account generation and an actual device payment/receipt still require end-to-end verification; a successful build is not payment-provider approval.


## Android 0.1.2 continuation (10 October 2026)

Dedicated Settings with profile editing, delivery address/phone editing, help, explicit account-deletion disclosure and fresh email verification. Light, dark and device-default appearance persist locally and apply to help/address/payment screens. App checkout and saved designs require sign-in. The native checkout request is marked `client: native`; the accompanying backend guard rejects missing/expired/mismatched sessions while preserving website guest checkout. Pending-payment restoration is scoped to the signed-in email.

Bag and page entrances, reduced-motion handling, approved logo on payment and receipt, and a countdown derived from the provider's actual transfer expiry are implemented. The receipt has a restrained paper entrance; exact matching to the user's reference video remains pending because that attachment was not recovered in this continuation.

Cancellation is an explicitly labelled customer-care request with the order reference prefilled. It does not immediately cancel fulfilment or issue a refund. Custom card entry remains blocked by the merchant-approval requirement already documented above; no card fields or substitute hosted flow were introduced.

Validation: mobile typecheck/lint; Android/iOS/web JavaScript bundle exports; root typecheck and customer-account/payment regression (including unauthenticated native checkout); rendered web checks for Settings, appearance, sign-in gates and phone/tablet rotation. Physical-device payment, expiry/background behaviour and accessibility still need device acceptance. The backend guard requires deployment separately from an APK update.

## Revised checkout — local, awaiting push approval

The revised order confirmation includes editable quantities and shipping details, live courier selection, Card / Bank transfer selection, account-scoped masked cards with removal, promo disclosure, expandable totals, security details and a pinned Pay now action. Closing checkout shows Continue to checkout / Leave anyway and retains the bag and pending reference. Savings shown in this dialog come only from the current server quote. System force-close cannot display an in-app confirmation; persisted pending references remain the recovery mechanism.

Saved-card support uses Paystack reusable card authorizations, never raw PAN/CVV. The authenticated receipt offers an explicit opt-in only after server verification of payment ownership, successful status, amount, currency, environment, customer email and a reusable unexpired card. Only masked metadata reaches the app. Authorization tokens use AES-256-GCM with an independent secret and owner/card-bound authenticated data. Save/list/delete/charge are scoped to the signed-in customer; account deletion destroys tokens. Charge amounts come from the server order. Card, transfer and hosted payments share one initialization claim, including after timeouts; verification/webhooks alone confirm orders. Failed or uncertain payments retain their reference for support/reconciliation rather than blindly charging again.

**Not complete:** new-card enrollment inside a merchant page without Paystack's payment sheet/popup. The documented mobile UI is a payment sheet; an approved embeddable Paystack-owned form has not been established for this Expo app. No raw card fields, popup fallback or hidden hosted form were introduced. Existing eligible, account-linked card receipts can supply a reusable authorization with explicit consent; customers without an eligible saved card can currently use bank transfer. Do not describe this build as fully supporting new-card checkout.

### Rollout for saved cards (not performed)

1. Apply `drizzle/0018_customer_cards.sql` after migration 0017, first in staging.
2. Set `APP_CARD_ENCRYPTION_KEY` as a secret containing 64 cryptographically random hex characters (32 bytes). Do not reuse the Paystack API secret or commit this value. Existing ciphertext requires the same key; key rotation requires a migration or removal/re-enrollment of saved tokens.
3. Set `SAVED_CARDS_ENABLED=true` only after migration/secret setup and staging acceptance. Default is off. Deploy the new backend with the mobile update; a client-only update does not enable cards. Test and live cards are isolated.
4. Obtain Paystack confirmation of a supported embeddable form for the merchant account, including native/Expo support and required bank-authentication screens, before implementing new-card enrollment. The owner must explicitly accept a changed payment-sheet design if that is Paystack's only supported route.
5. Complete provider test-mode/device acceptance for card enrollment, declines, bank authentication, expiry, consent/removal, payment interruption and webhooks. Current integration tests mock Paystack; no live charges or production database changes were made.

Validation for this revision: root/mobile typechecks, mobile lint, Android/iOS/web bundle export; backend regressions cover cross-account denial, explicit consent, provider/email/amount/environment mismatch, encryption, expiry, account deletion, concurrent charge attempts and cross-channel duplicate prevention. Rendered web smoke covers checkout, saved-card selection, exit/resume and retained pending payment alongside previous Settings/theme/account checks. This is not a signed APK or physical-device acceptance.

## Virtual receipt and You page — local revision

The supplied `40F94A0B-3E1A-42B0-941B-6E44FD84E81C.mov` was inspected in this continuation. The previous simple entrance is replaced by a fixed dark receipt printer, paper feeding through a clipped slot, thermal-paper typography, serrated edge and conditional PAID stamp. Motion can be replayed and is skipped for reduced-motion users. Real verified order data supplies the receipt; unconfirmed orders cannot display PAID. Confirmed totals include any verified processing fee. The native share action remains available; this revision does not add a native PDF download.

The customer Account tab is now labelled You, with profile, settings, an order-update bell, All/To pay/To ship/Shipped/Delivered order routes, wishlist count, coupons, delivered items To review, country/currency and help. Navigating between pages or signing in resets the main scroll position. The bell displays current order updates; read state is stored per account on this device. This is an in-app inbox, not APNs/FCM push delivery. Country selection now follows server-enabled shipping destinations; see the international shipping update below.

`GET /api/customer/center` returns only the customer's delivered, unreviewed purchases and active automatic or specifically assigned rewards with remaining campaign capacity. Shared/private coupon codes are never enumerated. Coupon eligibility is rechecked at checkout; selecting an offer does not guarantee a discount. Authenticated review submission verifies account ownership and reuses existing delivered-order validation, duplicate protection and moderation. No new database migration is required for these endpoints beyond the existing commerce/customer tables; the backend must be deployed alongside the app.

Validation: root/mobile typechecks, mobile lint, Android/iOS/web exports, backend account/coupon/review isolation tests and rendered web checks for order filtering, coupon display, review submission, notification read state and receipt movement from hidden paper to fully printed. Physical-device acceptance and push approval remain outstanding. No production changes or real payments/reviews were submitted.


## International shipping and keyboard update — local, pending push
- Shared address rules offer 68 countries when live international checkout is enabled. Nigerian state is mandatory; postcode is optional. International state/postcode requirements vary by country. Country selection is available in You and the address form; currency remains NGN.
- Both checkouts choose the cheapest eligible live rate automatically, invalidate stale address/cart quotes, and refuse payment without a current quote. No separate courier selection step remains.
- Nigeria postcode lookup uses Shipbubble address validation after complete details, with a one-day hash-keyed cache. A missing lookup result does not make the postcode mandatory. Address validation still must succeed for a courier rate. No guessed state-wide postcode is inserted.
- Website VisualViewport handling keeps fields and scrollable dialogs within the visible viewport; Android uses keyboard resize. Browser simulation passed; real iOS/Android keyboard QA remains before release.
- Read-only production audit on 2026-10-10: Shipbubble checkout enabled, legacy internationalEnabled=false with no international zones; no live international flag or Nigerian courier allowlist. Public site inspection returned 403 from this environment, so no live visual verification is claimed.
- On the approved backend rollout set INTERNATIONAL_COURIER_ENABLED=true alongside SHIPBUBBLE_CHECKOUT_ENABLED=true. This enables live overseas quotes without inventing fixed fees. Confirm destination coverage and customs/booking requirements with the merchant's Shipbubble account before live customer orders. Overseas dispatch preserves the actual destination and retains owner-reviewed booking.
- Set SHIPBUBBLE_NG_COURIER_IDS to exactly two distinct provider courier IDs after the owner supplies the two courier names and IDs are verified. This filters Nigerian rates only; no names or IDs have been guessed. With no allowlist, the existing available-courier behavior remains.
- Deploy backend capability changes before uploading the rebuilt Namecheap storefront and releasing the app. Do not enable legacy international fixed zones just to activate live rates. No deployment, push, provider booking or live charge was performed in this update.
- App Store/Play Store country availability, signing and submission are separate and still pending. New-card embedded entry remains blocked as documented above; this shipping update does not enable it.

## Worldwide checkout and owner settings — 10 October 2026
This update supersedes the preceding 68-country/two-courier plan. Checkout offers all 249 ISO countries/territories, hides courier names, and selects the cheapest available live rate. No country is promised service without an actual courier quote. Nigerian postcodes remain optional; worldwide lookup can complete missing city, region and postcode fields returned by Shipbubble. Manual correction remains available. Charges remain NGN.

Store settings now saves six independent sections using allowlisted fields. The Worldwide shipping switch saves internationalMode=live and internationalEnabled, without a country-by-country table. Existing fixed zones remain stored for compatibility but are not used in live mode. Live activation is a separate production setting change after backend deployment.

Owner dispatch offers available replacement services and fresh wallet charges when the saved courier is unavailable. Choosing a replacement sends its provider IDs through the existing reviewed booking flow; the customer is not charged again. An uncertain previous booking blocks alternatives until reconciliation, to prevent duplicate shipments. Enabling couriers happens in Shipbubble; this interface does not pretend to enable an unavailable provider.

Validation: root/mobile typechecks, mobile lint, backend shipping/rollout and dispatch regression tests, browser checks at phone/tablet/desktop widths for per-section saves and failed-save retention, checkout/address/keyboard checks, native account/receipt/payment mocks, Android/iOS/web bundle export and website/backend compilation. These do not replace physical-device or live-provider acceptance.

## Express/Standard delivery and Android build correction — 10 October 2026

This supersedes the previous automatic-cheapest policy. Customers see actual Standard/Express rates when explicit comparable ETAs support a faster option; Express is the default. Changing service recalculates reward totals and blocks payment while the quote is pending. Unknown/overlapping estimates do not create a false Express promise. A parity test keeps the app-packaged and website delivery rules identical.

Build 4 (`359e4249-b5dd-42c5-bc2d-dd0c0fa2ff75`) finished successfully and remains the last verified installable APK at this checkpoint. Build 5 (`51de2343-dc17-4e50-9121-61887fd74a0c`) failed eager bundling because its root-level delivery helper was unavailable to Metro in EAS. The helper is now packaged inside mobile/src, with the fix published in `e004e2d7dd3f62402a5f581d0bbd489c2905ecb4`.

Corrected Android build 6: https://expo.dev/accounts/vanta-noir/projects/vanta/builds/96485f16-f21c-492b-8e04-90a48b56f535
Version 0.1.2, versionCode 6, internal signed APK profile. At this checkpoint, eager bundling passed (1,351 modules) and Gradle was running; completion and APK must be checked before calling it installable. Root/mobile typechecks, mobile lint and Android export passed. Physical-device acceptance has not been performed.
