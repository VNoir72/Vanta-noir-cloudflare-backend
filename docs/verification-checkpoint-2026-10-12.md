# Verification checkpoint — 12 October 2026

## Results

- Regression suite: 244 tests; 243 passed, zero failed, one PHP-runtime-dependent skip.
- Mobile TypeScript and Expo lint passed. No APK was built or distributed during this verification.
- Checkout browser fixture passed after updating its catalog and app-preview mocks. Covered Express/Standard selection, Nigerian state/postcode, UK/US requirements, and simulated keyboard viewport changes. These are mocked API checks, not provider payment tests.
- Authenticated production admin successfully requested real provider sandbox comparisons from Shipbubble and Terminal for Lagos, Abuja, Kaduna and Port Harcourt; both providers returned rates.
- Terminal sandbox flow: quote, selection, total, simulated paid order, booking and refreshed tracking succeeded. Item value NGN10,000; Fez delivery NGN4,867.46; total NGN14,867.46.
- Saved sandbox test b4ec2608-7621-4433-889d-577969bb57c8; shipment SH-T3Z5RY1NHO715UDW; tracking 559302203135; confirmed event 2026-10-12T13:36:51.060Z.
- No real payment, live courier booking, or customer email was sent by this test.
- Live delivery/returns policy contact text updated to support@vantanoir.store, preserving other policy wording.

## Limits and release status

- Production Paystack is LIVE. Its payment page, payment completion and real callback were not exercised. Sandbox payment simulation is not proof of payment integration end-to-end.
- Terminal live connection authenticated, but admin reports wallet attention and live quotes/booking disabled; no wallet balance was independently established.
- App source is version 0.1.13. Latest previously known distributed artifact is 0.1.12 build22. A source change is not an installed-app update.
- Requested auth/profile, compact product-detail and media/admin controls exist in source. Real Android Google/password auth, App Check, physical-device keyboard and checkout remain unverified. Circle billing, SMS verification and branded Firebase auth require remaining activation work.
- Live App controls says App verification configured; real-device check required. App access rules unchecked, no exclusive drops/coupons and download link empty. Current Firebase auth domain selected.
- Carousel tee/socks retain floor-shadow remnants from automatic background removal. A generated tee cutout was prepared as a preview only; it was not published because garment print fidelity needs verification. Carousel artwork correction remains open.
- Gmail inbox-placement testing remains deferred. Prior message authentication passed but a test message landed in spam; no inbox guarantee is implied.

## Changed test fixture

The outdated checkout fixture omitted the app-preview drops array and required catalog fields. Updated mocks now match the exported app contract; no production checkout workaround was introduced.

