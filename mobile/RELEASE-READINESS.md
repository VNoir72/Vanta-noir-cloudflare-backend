# Release readiness — 2026-10-11

Validated checkpoint: exactly one initial H1 across 697 static pages; existing URLs preserved; public llms.txt; normalized SEO display names; obsolete hero preloads removed; native first-run guidance, offline notice and React screen recovery; corrected notification guidance.

Search Console: ownership verified through Cloudflare DNS and sitemap submitted successfully on 2026-10-11. Core Web Vitals shows no mobile/desktop field data yet.

Blocked: Namecheap browser reports temporary access restriction. Firebase project vanta-noir created on Spark; Android and iOS apps registered. Google and Email/Password providers enabled. Android SHA-1 matches the existing EAS signing certificate. Server service-account key creation is awaiting action-time approval. No private server key is in source.

Implemented in source (0.1.10): Google/password login, email verification/reset, verified-token exchange, disabled/revoked identity checks, existing customer linking and Firebase identity cleanup on deletion. New provider buttons fail closed until FIREBASE_AUTH_ENABLED and FIREBASE_SERVICE_ACCOUNT_JSON are configured. Optional native analytics and Crashlytics have separate opt-in settings; advertising identifiers disabled. Tests cover foreign/expired/tampered/unverified tokens, disabled/revoked identities, existing customer preservation and deletion failure safety. Android bundle export, lint, typecheck and config evaluation pass.

Outstanding: Apple sign-in (Apple Developer identifiers/credentials required); Firebase server activation and FCM service-account configuration; real-device push, payment interruption, accessibility, rotation and browser testing; beta testers; latest backend/admin and storefront deployment. Source push is not production publication.

Keep intentional noindex on private/checkout/admin pages. Keep current URLs and live publication checks. Do not embed private catalogue snapshots. Do not mark external services or device tests complete without evidence.

Android 0.1.10 EAS build requested from commit a29558d60f767b503be0037a7b35da6e34596ad5; Expo rejected the request because the free Android build quota is exhausted until 2026-11-01. No new APK was created and no paid plan was purchased. Existing 0.1.9 build 1339c67a-298b-4a15-99e2-2d6a75a2c3e3 succeeded but does not include this integration.
