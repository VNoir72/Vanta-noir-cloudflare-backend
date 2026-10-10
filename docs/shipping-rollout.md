# Shipping rollout

Shipbubble is the only selectable live provider. Terminal Africa is awaiting account verification and is hard-disabled by `shipping-policy.ts` and the checkout selection schema. A saved Terminal live key does not enable checkout or booking. Both providers remain available for isolated sandbox comparison.

Live quoting **at customer checkout** requires measured product/size profiles and a measured packaging preset in Admin parcel profiles, plus the saved business pickup address and `SHIPBUBBLE_API_KEY`. Quotes use the total packed weight, external dimensions and the value of all items including reward gifts. The parcel fit is still an estimate; confirm the packed parcel before manual fulfilment.

The backend rollout flag `SHIPBUBBLE_CHECKOUT_ENABLED=true` activates Shipbubble selection for Nigerian checkout. It defaults off. Until activated, existing configured delivery fees remain in use. Do not activate before measured profiles are saved and the Namecheap checkout update is uploaded. The presence of API keys alone never turns it on. International checkout continues to use configured delivery zones.

Customer rates are sorted by rate-card price (or total when no rate-card price is returned). Provider wallet cost is retained separately. Selection uses an opaque server-side quote ID and rate ID, is bound to normalized contact/address, cart and promotion/reward codes, and expires after 15 minutes. Checkout validates rewards and the final payment amount. Selected courier, provider reference, parcel and base delivery fee are stored atomically with the order. Existing checkout attempt IDs continue to prevent duplicate payment initialization; an unchanged existing attempt may resume after its quote expires, while new orders cannot.

Shipbubble fulfilment remains manual after payment and physical parcel confirmation. This release does not create paid courier bookings.

The dedicated live receiver is `POST /api/shipbubble/webhook`. It verifies the exact request bytes using Shipbubble's documented `x-ship-signature` HMAC-SHA512 and the existing production API key. Sandbox signatures are not accepted. Do not configure the generic courier receiver for Shipbubble. Configure the dedicated URL only after this code is deployed and its signature rejection is verified. No separate webhook secret needs to be created.

The owner-only `/api/admin/shipbubble` page checks the production account with a read-only wallet request, displays per-order packed measurements and the last authenticated webhook, and links manually booked shipments to paid orders. It never displays credentials or wallet balances and does not activate checkout. Linking verifies the shipment through the live API and matches the recipient email to the store order. Each shipment and order can have only one association. Signed events for unlinked shipments are acknowledged without modifying orders; linking fetches and applies the current provider state. Picked-up/in-transit map to shipped, completed maps to delivered; duplicates and backward events cannot regress the order. Shipment cancellation does not cancel/refund the store order. This receiver updates tracking/status and audit records; it does not send customer email notifications.

For automatic customer checkout rates, activation still requires actual measured item profiles, measured packaging, the checkout upload, and live quote acceptance. The account check alone does not verify route availability, booking, webhook delivery, or customer checkout.

Official protocol references: https://docs.shipbubble.com/api-reference/webhooks.md and https://docs.shipbubble.com/api-reference/tracking/get-multiple-specific-shipments.md.

Deploy source normally with the repository's Worker build/deployment procedure. `worker/shipping-overlay.ts` also provides a content-only bridge for the existing production Worker assets: it replaces only the relevant API handlers and applies the same request/response security policy. A subsequent full source deployment removes the bridge.

The Namecheap checkout update archive contains `checkout.html` and its generated `assets` files only. Back up the existing checkout page; merge into the existing document root, preserving other assets, configuration and images. The feature remains off until the backend flag is enabled. Revert the flag to disable Shipbubble quoting and use existing delivery fees. Restore the backed-up checkout page to roll back the frontend.

Verification: shipping comparison tests exercise provider failures and sandbox-only credentials. Shipping checkout tests use mock provider responses and isolated D1 to verify measured-profile gating, Terminal rejection, changed contact/cart/rewards, rate sorting, server totals, saved order selection and expiry. Existing rewards tests and both production builds are also checked. Mock live-key tests are not live provider acceptance tests.

## Fixed delivery fee, owner measures after payment

The owner selected fixed checkout delivery fees on 2026-10-09. Keep `SHIPBUBBLE_CHECKOUT_ENABLED` off. The existing delivery-zone fees still determine customer checkout; the final fee amounts and supported zones need the owner’s decision. Do not replace these with invented amounts or activate automatic customer rates.

At `/api/admin/shipbubble`, select a paid order awaiting dispatch, enter total packed weight in kg and exterior length/width/height in cm, and save. Measurements are stored per order with revision checks; missing, unpaid, shipped, cancelled or linked orders cannot be edited. No garment profiles are required for this workflow. One parcel per order is supported. Save changes before requesting rates.

Live rate requests use those saved measurements, the order address, declared goods subtotal and saved pickup details. They use tomorrow’s pickup date and create no shipment. The owner must verify the final pickup date and wallet charge in Shipbubble before booking. Rates display the delivery fee already collected and any shortfall borne by the store. Measurements never change the customer’s order totals. The one-to-one manual shipment link remains necessary for tracking events.

`worker/shipbubble-overlay.ts` is the bridge for this release only: two routes delegate to the new handlers, all other fetches and scheduled work remain on the previous production bundle. Use the existing assets and inherit bindings; no credentials are copied into source or displayed. A full deployment from `worker/index.ts` includes the same handlers.

## Approved weights and bulk dispatch — 2026-10-09

Checkout quoting is live after the matching Namecheap checkout asset upload. The owner-approved empty-box weight is now 2,000 g per parcel, plus each preset's packing allowance. Saved production profiles are editable; they are approved standards, not certified physical measurements.

Owner entry: `/api/admin/bulk-dispatch` (also linked from individual shipping). Select up to 20 paid orders on a page, confirm packing, edit whole-parcel fields where needed, and choose a requested pickup date. Review fresh rates before explicitly approving the displayed wallet total. Each request retains the customer's courier/service and order destination. A missing or unavailable courier is blocked instead of substituted. Older fixed-fee orders without a saved courier remain on the individual workflow.

The browser submits reviewed bookings one at a time and records outcomes in D1. Successful responses save shipment mappings and tracking automatically. Each order has a durable booking lock across batches, sessions and retries. Ambiguous provider responses or interrupted booking attempts cannot be automatically retried; inspect Shipbubble and reconcile the verified shipment through individual linking (in-progress attempts have a two-minute guard). Customer payment totals are never changed by dispatch.

No paid production shipment is created during deployment verification. The wallet must be funded before the owner books. Different selected couriers may require separate collections; a pickup date is a request, not a courier guarantee. Real webhook delivery remains unverified until a genuine shipment event arrives.

Validation: bulk-dispatch, shipping-checkout, shipping-comparison, order-measurements and shipbubble-webhook tests; TypeScript check. Provider contract checked against Shipbubble's official create-shipment and request-shipping-rates documentation. `courier_id` accepts provider numeric or string identifiers and is normalized to the documented string booking input.

## Website release continuation — 10 October 2026

- Campaign and eligible featured garments now share the homepage hero. Existing campaign media leads; product slides retain real catalogue prices and product links, touch navigation, manual controls, pause and reduced-motion support. The duplicate Featured section is removed.
- Preserve generated Worker module boundaries during deployment (`no_bundle` plus additional ES modules). The exact modular dry-run package passed the isolated backend release suite; the single-file packaging attempt did not complete its cold-page verification during this continuation.
- Validation: root TypeScript check; 31 shipping, dispatch and visibility tests; compiled and packaged backend checks; 697 static pages, 23,743 local links/assets and 3,724 photograph mappings.
- The Namecheap code update is built with 0644 file / 0755 directory permissions. Its publication requires the hosting session. Production rollout status is tracked separately from these build results.
