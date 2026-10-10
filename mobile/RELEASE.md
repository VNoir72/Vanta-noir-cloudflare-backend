# Vanta Noir app — first implementation, not store-approved

Customer app: native React Native/Expo 57 interface. Studio: separate build variant containing the existing protected admin in a WebView; this is not a rewrite of the administration UI. Both belong to Vanta Noir's existing repository. No live deployment or store submission has been performed.

## Implemented
- Customer catalogue from the API (no seeded sale stock), search, audience filters and preview-design protection.
- Existing approved logo and server-configured current hero; pearl/lime surfaces, iOS blur with reduced-transparency fallback; readable opaque fallback elsewhere.
- Product image selector, colours, sizes, product details and size guide; persistent bag and saved designs; product interest goes to the current backend.
- Email-code customer accounts, server-enforced order ownership, native Keychain/Keystore sessions, logout, saved address/profile, account deletion requiring recent verification.
- Customer order history/receipts. Guest tracking/support/policies open their website pages.
- Shipping quote selection and server totals with reward codes (including existing ZEROKADUNA eligibility). The app currently supports Nigerian addresses and NGN.
- Branded bank-transfer instructions, copy account number, payment verification and confirmation receipt. No hosted payment form is opened by the native customer app. No card details collected.
- Website custom transfer component behind CUSTOM_TRANSFER_ENABLED, retaining the existing checkout until enabled.
- Shared payment initialization lock across hosted and custom flows; repeat requests and ambiguous upstream outcomes cannot automatically create duplicate charges.
- Studio keeps Cloudflare Access and existing server-side owner/staff permissions. Never use the customer bearer token for admin access.

## Run locally
From mobile/: npm ci, npm run start. APP_VARIANT=studio npm run start selects Studio. Web export is a preview, not an installable native app. Native exports are JavaScript/Hermes bundles, not APK/IPA files.

## Backend rollout (must be completed before login/payments work)
1. Apply drizzle/0017_customer_app.sql in staging.
2. Deploy this branch to a staging backend. Configure existing Resend and Paystack TEST keys there. Set CUSTOMER_APP_ENABLED=true and CUSTOM_TRANSFER_ENABLED=true only in staging initially.
3. Set EXPO_PUBLIC_API_URL to that HTTPS staging origin before building. Add the preview web origin to the existing CORS allowlist only if web QA is required; native requests don't require broad CORS.
4. Test real email delivery and account recovery, native auth persistence/logout/deletion, transfer account creation and expiry, under/overpayments, interrupted payment, paid/failed receipts, and stock reconciliation with provider test fixtures. Unit tests use mocked upstream responses only.
5. Verify Paystack permits the custom Pay with Transfer channel on the merchant's live account and confirm any fees/customer disclosures. Do not claim support approval from documentation alone.
6. Perform a separate reviewed production deployment and migration. The flags default off. Do not disable the website's working payment methods until the custom flow is accepted and verified.

## Signing / distribution
App identifiers proposed: store.vantanoir.shop and store.vantanoir.studio. Confirm these are available and owned before signing. EAS profiles exist for customer/studio internal previews and production. Customer is linked to Expo owner vanta-noir, slug vanta, project fa2d496b-dfe1-490c-9c6c-c1d961442dd6. The GitHub build base directory must be mobile and branch codex/native-app-2026-10-10. Studio still requires its own separate EAS project ID; never reuse the customer project ID for Studio.

Use EAS signing with the owner's Apple/Google developer accounts. No developer accounts, EAS identity, signing certificates or provisioning profiles are present in this checkout. No APK, IPA or store submission has been produced. iOS internal distribution requires registered devices/ad-hoc provisioning or TestFlight as applicable. Decide the private staff distribution method before shipping Studio.

## Required before release
- Physical-device QA on supported Android, iPhone and iPad, including rotation, large text, VoiceOver/TalkBack, keyboard, Android back, expired sessions, weak/offline network, interruptions and persistent close controls. Bundle compilation is not device testing.
- Expo/Apple/Google account setup, icons and launch screens using the approved master artwork, store screenshots, support URLs, rating/content declarations, app review instructions and reviewer test account.
- Company spelling/registration and launch markets confirmed; privacy/terms/refund review by qualified counsel. Publish exact data retention periods and third-party processors, cross-border processing, user rights and marketing choices; assess Nigerian and destination-market obligations.
- External deletion page will be https://api.vantanoir.store/api/customer/delete-account after backend deployment. It must be live and tested before entering it in Play Console. The deletion flow must be reviewed against the published retention policy.
- Complete Apple privacy/Google Data safety forms from actual installed SDK behaviour; audit production manifests, dependencies and permissions. Existing policies have not been certified to cover this new app.
- Push notifications are NOT implemented in this first build. Device tokens, consent/preferences, APNs/FCM credentials, dispatch/delivery receipts and notification deep links remain to build and test.
- Cross-device bag sync, social sign-in, biometric unlock and native support/returns forms are NOT included. Email-code accounts, local persistent bag and website support/returns are the initial implementation.
- Full custom card checkout is BLOCKED pending Paystack eligibility and PCI DSS requirements. Do not insert raw card fields or hide/rebrand hosted Paystack UI. Bank authentication screens cannot be branded by Vanta Noir.
- Root website has not been repackaged for Namecheap from this branch; the previous working ZIP remains the live-upload package until this release is validated.

## Paystack support request to be sent by the owner
Please confirm that our Nigerian Vanta Noir merchant account can use the Charge API's Pay with Transfer channel with a fully merchant-designed website and mobile payment screen. Please confirm account eligibility, expiry behaviour, fees (including any customer-paid fees), required branding/disclosures, webhook events and the production acceptance checks. We also want a merchant-designed card-entry flow: please specify the PCI DSS evidence, approval and supported integration required before we collect card data. We will not collect raw card details until those requirements are satisfied.


## Android 0.1.1 integration update (10 October 2026)

Native help, contact ticket submission, policy pages, grouped Nigerian address entry with a state selector and validation, address-book editing, checkout address/item review and pinned payment action are implemented. Terms and privacy text are reproduced from the store with native account/storage disclosures. Update the bundled policy text when the published policies change.

The customer account D1 tables and native endpoint overlay are deployed to vanta-noir-api. CUSTOMER_APP_ENABLED and CUSTOM_TRANSFER_ENABLED are true. The current deployed storefront/admin bundle and hosted guest checkout were preserved. Live email delivery, live bank-account generation and an actual device payment/receipt still require end-to-end verification; a successful build is not payment-provider approval.
