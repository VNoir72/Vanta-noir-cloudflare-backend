# Vanta Noir branded tracking and operational automations

Customers use `https://vantanoir.store/track?reference=VN-…`. The Vanta Noir order reference is their tracking number. Checkout email or phone verification remains mandatory; reference-only URLs reveal no order information. Courier identifiers remain intact for compatibility and private operations. Customer account links and new order emails point to Vanta Noir. Returns continue through the existing help-centre workflow.

The storefront serves only `/track` and `/track.js` through its existing PUBLIC_API service binding. Its adapter incorporates the exact deployed account-theme and checkout-only Paystack policy before adding these routes. Existing storefront assets are retained. Tracking uses no analytics, local storage or contact details in URLs. Courier event strings are rendered as text. The layout has one column on phones and two on wider screens.

Booking already writes the two-way Shipbubble shipment/order association. Booking now also saves a normalized tracking snapshot; failure to save this optional snapshot never retries or invalidates a successful paid booking. Signed webhooks save normalized stages, scans and timestamps. Updates retain the existing monotonic paid-order transitions and duplicate protection. Shipment cancellation does not cancel an order, refund payment or create a replacement booking. Snapshot compare-and-swap retries prevent concurrent events from regressing delivery progress. Only the latest 40 normalized scans and 20 stages are retained, without raw provider payloads.

New rules appear in Admin → Automations → Additional automations, enabled by default like the existing rules. The existing five-minute scheduler invokes each rule according to its configured interval:

| Rule | Default | Behavior |
| --- | --- | --- |
| Delivery progress and exceptions | 15 minutes; 48-hour stall threshold | Read at most ten due linked paid shipments per run, rotating fairly. Signed webhooks remain the immediate path. Save courier progress and queue transactional customer updates with Vanta Noir links. Flag cancelled shipments, absent progress and refresh failures for the owner. Recent courier scans reset the stall clock. |
| Security review alerts | 15 minutes | Flag recent payment reference/currency/application discrepancies and hourly aggregates with at least five exceeded request windows. No automatic customer suspension. Request aggregates contain no IP, email, token or URL and expire after fourteen days. |
| Daily product-interest digest | Hourly check; after 18:00 Africa/Lagos | At most one owner digest per day when there is interest. Include the top ten designs by recent interested visitors and confirmed subscriptions, stock and saved size/colour preferences. No launch or production action. |

All new emails use the existing durable outbox, provider idempotency and service budgets. New rule switches are rechecked before sending. Obsolete customer shipment-stage messages are suppressed before sending. Marketing consent requirements for checkout reminders, aftercare and subscriptions remain intact.

No new secret, table, migration, cron, mobile binary or mobile runtime change is required. The live database had no linked Shipbubble shipment and no authenticated webhook record during the pre-release check. Real delivery scans will therefore first be visible after a shipment is booked in the admin or manually linked using the existing recipient-verified linking tool. Periodic reads also recover progress if the provider webhook has not yet been configured.

Validation covers signed event authentication, ownership checks, duplicate and out-of-order events, concurrent completion, safe provider-text rendering, courier scan freshness, missed-webhook recovery, provider outage retention, owner-alert and customer-email deduplication, daily digest deduplication, and storefront credential isolation and checkout CSP. Existing shipping, receipts, returns, account restrictions and automation tests remain release checks.
