# Admin and storefront verification — 5 October 2026

## Changes

- Give desktop/tablet content its own viewport-height scroll area; contain sidebar and content overscroll separately. Keep the mobile bottom navigation in a reserved row.
- Keep section transitions at the top and unsaved-editor protection intact.
- Reject unsupported, empty and oversized image files before upload; lock simultaneous uploads in product and campaign editors. Return a recoverable storage-unavailable response.
- Lock concurrent product writes and bound publish/archive/delete requests with a timeout.
- Reconcile an already-committed email resend if a competing write raises an exception, while preserving recipient checks and duplicate-send protection.
- Validate public settings instead of allowing malformed nested values to crash customer pages. Bound settings requests.
- Add an editable delivery policy alongside the existing editable returns policy. Render both on Delivery & returns.

## Tests

| Area | Evidence |
| --- | --- |
| Navigation | Chromium mouse/touch-capable viewport tests at 390, 768, 820, 1023, 1024 and 1180px; rotation; separate sidebar/main scrolling; no horizontal overflow; More drawer; unsaved-edit cancellation |
| Admin sections | Overview, Products, Orders, Inventory, Customers, Returns, Analytics, Collections, Media, More tools, Approvals, Staff, Activity and Settings render without page exceptions, including unavailable/malformed fixture responses |
| Image editor | Front/back/left/right target assignment; failed replacement preserves old view; retry; removal preserves other views |
| Upload/API lifecycle | Real PNG round-trip through isolated R2 and media endpoint; MIME/empty/oversize/unauthorized rejection; ETag; private staging rejection |
| Products | Create draft, publish, archive, restore draft, republish, update image/stock, remove; public catalogue changes asserted; ordered-product deletion refused |
| Commerce | Existing suite exercises payment replay, checkout validation, stock reservations/races, promotions, rewards, customer privacy, returns/restocking, delivery, email webhooks/retries and staff approval boundaries |
| Policies | Settings save/read round-trip; built storefront display, narrow/wide layouts and malformed-settings recovery |
| Static hosting | 697 rendered pages, 19,676 local links/assets, 682 private product shells and 3,724 image delivery files checked |

## Policy source and publication constraints

The live settings were read before drafting. They specified test checkout/no shipment, Kaduna only, and the support address vantanoir.xyz@gmail.com. The new policy preserves that status. It does not invent additional shipping destinations, prices, a voluntary return deadline, or a refund turnaround. Editable delivery rates and estimates remain authoritative. Earlier 14-day/7-day proposals were not approved and are not silently adopted.

Consumer-rights reference: https://fccpc.gov.ng/consumers/consumer-rights-responsibilities/rights-responsibilities/ (checked 5 October 2026). Policy text is in customer-policies-2026-10-05.json.

## Limits

No real customer products, orders, payments, messages or inventory were used for destructive testing. Browser checks are emulation, not physical iPad Safari certification. No finite test suite establishes that a website is unbreakable. One initial concurrent-email test returned 409; six targeted repeats and three subsequent full-suite repeats passed. Diagnostic output was retained and already-committed resend reconciliation added; this is not a claim that the original intermittent cause was conclusively identified. PHP gateway tests require the PHP-enabled CI runner because PHP is absent locally.
