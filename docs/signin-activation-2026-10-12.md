# Sign-in correction and activation checkpoint — 12 October 2026

## Live website corrections

- Store sessions now persist across browser tabs/restarts, bounded by the server expiry and a maximum of 30 days. Existing tab sessions remain usable; sign-out clears both stores. Restricted browsers fall back to tab storage.
- Firebase persistence uses local persistence with session fallback.
- A delayed 401 from an old request cannot erase a newer login.
- Terms consent appears above Google sign-in, with an explanation while the button is disabled. Consent is not preselected or bypassed.
- Focused tests: four passed, zero failed. Root TypeScript passed. Static export verified 698 pages and 25,172 links/assets.
- Deployed storefront version a13411ee72be4e618be1fc7b84dfd559. Live account screen verified updated ordering and text. Actual customer Google sign-in was not performed in this checkpoint.

## Branded sign-in

Firebase Hosting detailed domain manager shows auth.vantanoir.store Connected. Existing Cloudflare CNAME points to vanta-noir.web.app, DNS-only. Added auth.vantanoir.store to Firebase Authentication authorized domains and confirmed it appears in the allowlist. Google and Email/Password providers are enabled.

The Google Cloud OAuth clients page was unavailable to this browser after one reload. The existing web OAuth client still needs its redirect configuration checked for https://auth.vantanoir.store/__/auth/handler. Do not flip AUTH_CUSTOM_DOMAIN_READY or the growth authDomain until this is verified. The runtime continues to use vanta-noir.firebaseapp.com in the meantime.

## Circle billing

No owner-selected Circle price/benefits or billing plan is saved (growth:v1 absent); the UI fallback amount is not an approved price. Billing remains closed. Required remaining input/checks: owner price, billing interval and physical-shopping benefits; provider sandbox subscription lifecycle and real-device App Check. Production Paystack key remains live and unchanged. No recurring charge or Firebase paid-plan upgrade was activated.

