# Shipping rollout

Shipbubble is the only selectable live provider. Terminal Africa is awaiting account verification and is hard-disabled by `shipping-policy.ts` and the checkout selection schema. A saved Terminal live key does not enable checkout or booking. Both providers remain available for isolated sandbox comparison.

Live quoting requires measured product/size profiles and a measured packaging preset in Admin parcel profiles, plus the saved business pickup address and `SHIPBUBBLE_API_KEY`. Quotes use the total packed weight, external dimensions and the value of all items including reward gifts. The parcel fit is still an estimate; confirm the packed parcel before manual fulfilment.

The backend rollout flag `SHIPBUBBLE_CHECKOUT_ENABLED=true` activates Shipbubble selection for Nigerian checkout. It defaults off. Until activated, existing configured delivery fees remain in use. Do not activate before measured profiles are saved and the Namecheap checkout update is uploaded. The presence of API keys alone never turns it on. International checkout continues to use configured delivery zones.

Customer rates are sorted by rate-card price (or total when no rate-card price is returned). Provider wallet cost is retained separately. Selection uses an opaque server-side quote ID and rate ID, is bound to normalized contact/address, cart and promotion/reward codes, and expires after 15 minutes. Checkout validates rewards and the final payment amount. Selected courier, provider reference, parcel and base delivery fee are stored atomically with the order. Existing checkout attempt IDs continue to prevent duplicate payment initialization; an unchanged existing attempt may resume after its quote expires, while new orders cannot.

Shipbubble fulfilment remains manual after payment and physical parcel confirmation. This release does not create paid courier bookings.

The dedicated live receiver is `POST /api/shipbubble/webhook`. It verifies the exact request bytes using Shipbubble's documented `x-ship-signature` HMAC-SHA512 and the existing production API key. Sandbox signatures are not accepted. Do not configure the generic courier receiver for Shipbubble. Configure the dedicated URL only after this code is deployed and its signature rejection is verified. No separate webhook secret needs to be created.

The owner-only `/api/admin/shipbubble` page checks the production account with a read-only wallet request, displays measured-profile counts and the last authenticated webhook, and links manually booked shipments to paid orders. It never displays credentials or wallet balances and does not activate checkout. Linking verifies the shipment through the live API and matches the recipient email to the store order. Each shipment and order can have only one association. Signed events for unlinked shipments are acknowledged without modifying orders; linking fetches and applies the current provider state. Picked-up/in-transit map to shipped, completed maps to delivered; duplicates and backward events cannot regress the order. Shipment cancellation does not cancel/refund the store order. This receiver updates tracking/status and audit records; it does not send customer email notifications.

Activation still requires actual measured item profiles, measured packaging, the checkout upload, and live quote acceptance. The account check alone does not verify route availability, booking, webhook delivery, or customer checkout.

Official protocol references: https://docs.shipbubble.com/api-reference/webhooks.md and https://docs.shipbubble.com/api-reference/tracking/get-multiple-specific-shipments.md.

Deploy source normally with the repository's Worker build/deployment procedure. `worker/shipping-overlay.ts` also provides a content-only bridge for the existing production Worker assets: it replaces only the relevant API handlers and applies the same request/response security policy. A subsequent full source deployment removes the bridge.

The Namecheap checkout update archive contains `checkout.html` and its generated `assets` files only. Back up the existing checkout page; merge into the existing document root, preserving other assets, configuration and images. The feature remains off until the backend flag is enabled. Revert the flag to disable Shipbubble quoting and use existing delivery fees. Restore the backed-up checkout page to roll back the frontend.

Verification: shipping comparison tests exercise provider failures and sandbox-only credentials. Shipping checkout tests use mock provider responses and isolated D1 to verify measured-profile gating, Terminal rejection, changed contact/cart/rewards, rate sorting, server totals, saved order selection and expiry. Existing rewards tests and both production builds are also checked. Mock live-key tests are not live provider acceptance tests.
