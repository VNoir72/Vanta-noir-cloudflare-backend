# Admin dashboard completion and management review — 4 October 2026

## Implemented
- 7/30/90-day and custom date ranges (maximum 366 days), equal previous periods, truthful zero-baseline comparisons, metric sparklines, comparison revenue chart and period-specific CSV exports.
- Reporting dates and cash definitions are explicit. Paid non-cancelled orders are grouped by UTC creation date; delivery is included; refunds remain separate. Best sellers and categories follow the chosen period. Recent orders are independent of Orders filters.
- Read-only GA4 Data API integration for purchase-session conversion, daily trends and weighted previous-period comparisons. Credentials remain server-side; tokens and reports are cached; provider failures never fabricate zero conversion or interrupt sales reporting.
- Global product/name/SKU, order/reference/name/email/phone and customer search, plus management navigation and Ctrl/Cmd+K.
- Notification bell for paid orders, processing orders, stock review, low stock, open returns, email delivery review and drafts. Order/return/email counts refresh every minute while the admin is visible. Stock and draft figures come from the loaded inventory/catalogue; refresh the dashboard after changes elsewhere. Review state is per signed-in account on the current device. Reviewing does not dismiss an unresolved task.
- Orders badge, filtered links from alerts, draft filters, distinct payment/fulfilment colours and visible fulfilment statuses on narrow screens.
- Customers directory with search, paging, paid totals and exact-email order history. These totals are collected amounts, not lifetime profit or refund-adjusted value.
- Customers now hosts customer care, moderation, subscriptions and email delivery. Settings focuses on business configuration and connection status. Returns, Delivery, Staff and Activity are directly accessible; detailed reports are linked from Analytics. Stock history remains under Inventory and More tools.
- Account menu, report controls in the header, and persistent selection of an existing garment image for dashboard artwork. No demo sales, preview-mode badges, unapproved logos or Season 01 text added.
- Low-stock alerts/filter now honour the configured threshold. Delivery tracking has dirty-state navigation protection, disabled in-flight fields and persistent Saved feedback; packing slips use recorded tracking.

## Required external setup
GA4 reporting credentials are absent from the live Worker. The storefront already uses measurement ID G-29RJ57JB76 with consent. Add numeric GA4_PROPERTY_ID and secret GA4_SERVICE_ACCOUNT_JSON, grant that service account Viewer access, enable Analytics Data API and retain purchase as a key event. The admin Settings > Connections panel explains setup. No secret belongs in GitHub or chat. Until configured, conversion remains labelled as awaiting connection. Reports honour GA4's property timezone; order revenue uses UTC.

Courier booking/rates/labels and automatic delivery updates still need a chosen provider/account/API integration. The generic receiver/manual tracking already exist. This update does not activate a courier or issue refunds; recorded refunds still require processing in Paystack.

## Broader management review
Benchmarked against Shopify's documented administration, inventory, reporting and role workflows; this is a practical ecommerce comparison, not a certification against one universal admin standard.

| Capability | Current position | Next step |
|---|---|---|
| Products, variants, images, publish/archive | Present | Add saved list views and richer bulk publishing only when needed |
| Inventory, reservations, adjustments and history | Present | Supplier records, purchase orders and incoming-stock receiving are missing |
| Orders, tracking, packing slips | Present | One canonical owner/staff order detail view would further reduce duplicate implementation |
| Customer directory/history | Added | Optional private service notes/tags and a consent-aware customer export workflow |
| Returns/exchanges/refund records | Present | Provider-confirmed refund reconciliation; no automatic money movement added |
| Sales and purchase conversion | Sales complete; GA4 connector awaits credentials | Cost-per-variant snapshots, landed costs and margin/profit reports are missing |
| Payments | Paystack verification exists | Settlement matching, fees and payout reconciliation are not in admin |
| Staff and permissions | Present; management data restricted to owner | Broader before/after audit coverage: general product/settings changes are not all logged |
| Customer email | Queue, review and maintenance tools present | Provider delivery/bounce event visibility and recovery controls could be extended |
| Suppliers/manufacturing | Not present | Useful next investment for Vanta Noir: supplier, production order, expected quantity and receipt tracking |
| Multiple stock locations/barcodes | Not present | Lower priority until stock is managed across locations or fulfilment volume grows |
| Backup/recovery UI | Not present | Separate verified recovery runbook and owner-facing backup status; do not infer absence of platform backups |

Priority for this startup: connect GA4 and the selected courier, then capture manufacturing costs and incoming stock. Avoid crowding the main sidebar with accounting/warehouse tools before they are used.

## Validation
TypeScript checking; reporting boundary/zero-baseline and configurable-threshold tests; mocked GA4 authentication/report/cache/failure tests; isolated compiled-Worker tests for comparison totals, cancelled/unpaid exclusion, search escaping, customer grouping, fulfilment filtering, artwork persistence, and staff permission denial. DOM interaction checks cover date controls, SKU search/shortcut, a 12-order alert, reviewed state, customer links and tracking save guards. Browser screenshot verification was unavailable because the Chromium download failed; no visual screenshot verification is claimed.

## Sources
- https://help.shopify.com/en/manual/shopify-admin/shopify-admin-overview
- https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/overview-dashboard
- https://help.shopify.com/en/manual/your-account/users/roles/permissions/store-permissions
- https://help.shopify.com/en/manual/products/inventory/purchase-orders
- https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/profit-reports
- https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart
- https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema
