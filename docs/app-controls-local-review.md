# App Controls — local review, not released

This change is intentionally local. Do not deploy, push or trigger EAS until the owner authorises it.

## Implemented scope

- Owner-only App Controls panel with Edit/Save/Cancel, preview, unsaved-navigation guard and compare-and-swap version checks. The panel uses existing admin theme variables and a single-column layout below 600px.
- Scheduled app early access and permanent app-only product rules. Optional VIP email eligibility, customer quantity limits, total exclusive allocation, pause, website teaser/hidden mode, app opening and automatic public release. Published/active product requirements remain in force.
- Existing promotions and shipping/gift reward codes can be restricted to app, website or both, with first-purchase eligibility, uses per account, and optional discount cap. Existing amount/date/country/gift/global usage/stacking controls stay in their original editors.
- Server-verifiable Android App Check plus customer sign-in; a client/native label alone grants nothing. Protected checks run in catalog, quote, shipping and order creation. Purchase and offer caps are enforced in the same D1 transaction as the existing stock reservations.
- App Benefits screen, drop reminders, colour/size restock subscriptions, availability inbox, and opt-in phone alerts through the existing push registration. Watchers do not reserve stock. Deleting the account deletes its alert records.
- Website teaser/download entry; restricted product metadata and sitemap entries remain hidden until public release.
- Channel totals from newly recorded orders; old orders are not retroactively labelled. Media controls link to the existing Storefront design editor rather than introducing conflicting copies.

## Deliberately unchanged

Payment providers, shared customer identities, ordinary stock fields, staff approval flows, theme preferences, existing products/coupons with no access rule. No migration, remote configuration edit, notification send or live data change has been performed.

The optional ideas (points programme, fit profile, design voting) and a general-purpose notification campaign composer are not part of this first implementation. App-only archive products can use the permanent app-only rule.

## Release prerequisites

1. Firebase: register the existing Android app with App Check / Play Integrity, using the actual APK signing certificate SHA-256. Configure the provider for the intended installation channel (the current APK is distributed outside Google Play). Never ship a debug token or a static client secret. Confirm a real APK can obtain an accepted token.
2. Worker: configure FIREBASE_PROJECT_NUMBER and FIREBASE_ANDROID_APP_ID to the existing project's numeric project ID and the exact Android Firebase app ID. Web Firebase app IDs are not accepted. No secrets should be pasted in chat.
3. Compile and test the new Android native dependency after the owner authorises the APK build. TypeScript and lint do not validate native Kotlin/Gradle compilation.
4. Deploy the complete tested worker/admin/frontend release, including catalog, shipping and reward quote changes. Do not deploy only the old customer-route overlay: it does not contain all access enforcement routes.
5. Upload the updated website package with the gateway/.htaccess together. Device testing must cover Google sign-in, attestation on the sideloaded APK, real push delivery, portrait/landscape and narrow-screen navigation.
6. Start with app access rules off. Create a test product/code and verify web rejection and app success before enabling a real campaign.

## Operational notes

- Turning off “Apply app access rules” removes channel restrictions. To stop a drop without releasing it on the website, pause the individual drop instead.
- Dates in the admin are UTC; customer dates display in their device locale.
- An exclusive allocation is a cap on purchases from the shared stock pool, not an extra stock quantity. Public release lifts the early-access cap; physical stock rules always remain.
- Changing rules during checkout makes the previous checkout review stale. It never silently charges a revised amount.
- App Check failure locks only benefits; ordinary shopping still works. Tokens are cached briefly; verification outages use a short retry backoff.
- Reminders are checked in bounded scheduled batches. Push provider acceptance is not proof of delivery; the app inbox provides the same availability notice. Availability can change before checkout.
- Full visual rotation/device testing is still pending: the available cloud browser could not reach the local preview server. DOM interaction, responsive CSS contract, theme, backend and access tests are local checks, not a substitute for native-device acceptance.

## Local validation results

- Full regression suite: 226 passed, zero failed, one existing skipped test (227 total); the skipped Namecheap gateway test requires PHP, which is not installed.
- Subsequent focused acceptance suite: 14 passed, including Android-token verification, channel bypass rejection, early-access/VIP boundaries, competing checkouts, saved editor state and shipping/reward binding.
- Root and mobile TypeScript checks passed; Expo lint passed with no errors or warnings.
- Follow-up coverage checks optional alert-provider failure isolation, repeat-send suppression, first-purchase eligibility and allocation limits across different accounts.
- No live payment was taken, no customer alert was sent, and no remote data was edited by these tests.
