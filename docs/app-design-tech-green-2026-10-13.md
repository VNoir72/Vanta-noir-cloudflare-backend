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
