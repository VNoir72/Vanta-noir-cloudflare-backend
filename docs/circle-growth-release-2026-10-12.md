# Circle, audience and partnerships release

Admin: App controls → Circle, audience & partnerships (owner only).

- Configure Circle's NGN price, monthly/yearly interval, plan and benefit descriptions. Existing provider plans must match the saved amount/currency/interval. New prices apply to new subscribers, not existing agreements.
- Set actual discounts in Promotions/Rewards and check Circle members only in app access rules. Membership access requires an authenticated account plus valid Firebase App Check; website requests cannot claim app-only entitlement.
- Audience reports registered users, opt-in online/idle/offline/unknown activity, rolling 24-hour/30-day unique accounts and latest 100 last-seen records. Offline is inferred, not proof of network state. Foreground heartbeat interval 60 seconds, freshness 2 minutes. Cleanup 31 days. No location or browsing history collected.
- Sponsorships: app/web/both placements with sponsor label, uploaded store image, HTTPS destination and UTC schedule. No ad network SDK. Sponsor contracts and invoicing are separate business operations.
- Hero: optional individual product/media/hidden slots, three by default, fourth opt-in. Videos-only mode overrides slots. Media scheduling fields are supported by the backend.
- App and web have phone verification and optional activity sharing. Circle UI is app-only. Google consent is now above the sign-in button with an explanatory message.

## Activation requirements — not active merely because code is deployed

- Circle enrolment defaults off. Keep CIRCLE_BILLING_ENABLED unset until provider sandbox lifecycle tests, real-device App Check and owner price/benefit confirmation are complete. PAYSTACK_SECRET_KEY stays a Worker secret. No real payment was made during verification.
- This billing implementation targets physical-shopping/real-world benefits in direct Android distribution. Digital benefits on store-distributed apps require appropriate store billing; Apple/Google in-app subscription billing is not implemented.
- Firebase Android App Check registration requires explicit action-time approval of Google APIs and Play Integrity API terms. A native-device sign-in/attestation check remains necessary.
- SMS requires Termii's API key, approved sender ID and assigned HTTPS termii.com base URL in TERMII_API_KEY, TERMII_SENDER_ID, TERMII_BASE_URL. Enable in admin after setup. Six digits, five minutes, five attempts; account/number/IP/global limits. Phone possession is not legal identity verification. No SMS sent during automated tests.
- Custom auth domain must complete Firebase Hosting certificate setup, Firebase authorized domain and Google OAuth redirect https://auth.vantanoir.store/__/auth/handler. Only after end-to-end testing set AUTH_CUSTOM_DOMAIN_READY=true and select it in admin. Keep existing auth domain until then. Email sender DNS/templates are a separate setup.
- Pending Circle checkouts are reused and cannot create duplicate subscriptions. A provider initialization failure leaves a pending record for support reconciliation; do not delete it or create a replacement without checking the provider first.
- Webhook-driven renewals depend on subscription/invoice events. Provider sandbox renewal/cancellation/refund flows remain a release gate. Collections metrics are gross, before fees/refunds; MRR is an estimate.

## Verification

Rebuilt after workspace cleanup. Full suite: 236 passed, zero failed, one PHP-environment skip. Root and native type checks, native lint and backend/static builds. Isolated billing tests cover concurrency, amount/account mismatch, replay and full-refund replay. These checks are not claims of successful real SMS, live subscriptions, physical-device OAuth or every physical screen layout.

Do not start another paid Expo APK build until external configuration and visual/device acceptance gates have been cleared. Frontend deployment to Namecheap is separate from pushing code and deploying the Cloudflare API/admin.
