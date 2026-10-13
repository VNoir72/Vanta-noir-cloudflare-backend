# Tech-green Android design update

The owner authorized pushing the approved app design while retaining tech green.
The admin concepts remain mockups; this change does not alter the admin panel.

Changes:
- Compact You page with real To pay/Processing/Completed counts, Saved, Coupons,
  Reviews, notifications, country/currency, appearance, Circle and address links.
- Settings grouped into account, preferences, and privacy/help. All previous
  settings remain reachable, with media/network/history under General settings.
- Charcoal branded bag opens the verified receipt with a rising/expanding reveal
  and immediate display when reduced motion is enabled.
- Order progress explicitly maps verified paid fulfilment states; cancelled,
  refunded and stock-review orders do not show a normal delivery journey.
- Country selection automatically chooses its browsing currency. Current legal
  tender comes from Unicode CLDR currencyData (snapshot 2026-10-13):
  https://github.com/unicode-org/cldr-json/blob/main/cldr-json/cldr-core/supplemental/currencyData.json
  Multiple-tender territories use the first current CLDR entry. Currency can
  still be changed manually. Prices fall back to NGN without a fresh rate;
  checkout billing remains NGN.
- Drop calendar has date cards and clearer restock/reminder presentation.

Validation: mobile typecheck, lint, Android/web exports, and two focused behaviour
checks passed locally. No dependency, native configuration, payment, membership,
or backend changes. No new-card inputs or unsupported security features added.

The manual EAS workflow publishes Android only using the existing production
build environment and customer variant. Default destination is preview; confirm
its runtime matches the installed Android build before production publication.
Physical-device animation, small-screen and payment-flow acceptance remain to
be confirmed; JavaScript export is not an APK or device test.

## Publication checkpoint

- Verified source pushed as `ded8d084d25fcefebf61ff33508469f85fc6fab1`.
- Expo GitHub base directory saved as `/mobile`.
- Expo's web workflow picker did not discover the committed workflow, including
  after reloading the saved directory. No OTA update was published.
- Android production-apk build requested from the exact verified commit:
  `721e0a77-5e5a-4846-bb16-e3902d26483a`.
  At this checkpoint Expo reports Pending. Automatic store submission is off.
  Do not claim the APK is ready, installed, or deployed until its result is checked.

## Revision after cancelled build

Build `721e0a77-5e5a-4846-bb16-e3902d26483a` was confirmed **cancelled** at the owner's request. The earlier Pending checkpoint above is historical. Do not restart a build or publish an OTA from this revision without a new instruction.

Source implementation now uses tech green `#00ff66` in light and dark themes:

- Email-first sign-in, pearl/dark ribbon banner, Google alternative, password visibility, full-name signup field, password requirements, linked consent and email verification guidance.
- Account row navigation: saved items, saved addresses, coupons, notifications, reviews, calendar, settings and support.
- Compact saved-address cards; image quality surfaced in Settings; country-to-currency explanation and account deletion entry.
- Separate checkout review and payment-method steps; compact read-only order rows; existing secure provider and verified transfer flow retained.
- Charcoal branded bag with paper emerging behind it before the full receipt appears; reduced-motion fallback; View order action.
- Dedicated tracking sheet with reference copy, four fulfilment stages, carrier details when returned, and order-specific support.
- Coupons Available/Used/Expired, real customer-scoped reward history, and manual code entry. Shared code values are not disclosed in history.
- Notifications All/Orders/Drops with live order states, scheduled drop announcements, and preference navigation.
- Calendar month navigation, real scheduled-date markers, selected-day filtering and reminders.
- Searchable help articles, popular topic navigation, prefilled support details, message counter and Information policy accordions.
- Circle billing history, actual membership price/renewal details, provider-hosted payment-method and cancellation controls.
- Security: verified-email status, password reset, Firebase authenticator enrolment/removal, MFA sign-in on Android and shared web account, customer-scoped session listing/revocation, contact editing.

Release limitations: source is updated, not deployed. The new session/history/coupon endpoints require backend deployment along with the app. Firebase TOTP service activation has not been verified; unsupported enrolment reports an error rather than marking protection enabled. Native authenticator enrolment/removal, payment-provider return flow, small-screen layouts and receipt animation still require physical-device acceptance. No live payment, support message, account-security setting, membership or customer data was changed during development. Do not describe this as an installed app update or pixel-perfect acceptance of every board.

Verification: mobile TypeScript, Expo lint, web export, backend TypeScript, focused customer/payment/rewards/Firebase tests and country/order-state tests pass. Session tests verify owner isolation, preservation of current session and successful revocation. Web sign-in regression tests pass. A browser/device visual acceptance pass remains outstanding.
