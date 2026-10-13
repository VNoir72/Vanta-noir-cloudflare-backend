# Admin, checkout and Paystack audit — 13 October 2026

## Scope and changes

Audited 33 filesystem admin routes (61 exported HTTP handlers) and three direct Worker admin routes. Tested 67 method/path combinations with anonymous requests and forged customer/role headers. Valid signed nonstaff and support identities cannot read or mutate CRM; the configured owner can read CRM. Route-level authorization already existed. A central Worker gate now also protects all `/api/admin` paths before request parsing and dispatch. CRM's owner check remains explicit before any database call. Database outages fail closed.

Cloudflare Access JWTs are verified on the server with RS256, issuer, audience, expiration and the issuer's JWKS. A header claiming an owner email or a customer bearer token is not sufficient. The signed email maps to the configured owner or an active database staff role. Resource-level permissions and owner approval for staff mutations remain in place.

Checkout loads current product prices from D1 and delivery pricing from D1 shipping zones or a saved courier quote validated against the cart, address, expiry and parcel revisions. Removed the flat environment-price fallback from payment checkout. Production has 37 domestic shipping-zone entries; live courier selection remains supported. An unavailable zone fails closed. `expectedTotalKobo` from the client is only a stale-price comparison, never the source of a charge. Additional client `amount`, `totalKobo` and `shippingKobo` fields are discarded by input validation.

Prices are already integer kobo in the database. The backend sums product prices times quantities plus shipping, less server-validated promotions/rewards. It must NOT multiply existing kobo values by 100 again. Approved promotions and shipping rewards remain enabled; this change does not silently revoke configured customer benefits. New checks reject negative, fractional or unsafe integer totals. No Paystack percentage or fixed transaction fee is added. Native Paystack dashboard fee pass-through must remain enabled; that dashboard setting was not independently verified in this audit.

References are generated on the server and persisted before initialization. Retriable checkout attempts derive a deterministic backend reference from a hashed idempotency token; other attempts use a random UUID. The client cannot assign an arbitrary reference or amount to initialization. Initialization reloads the saved order and uses `order.totalKobo`.

Webhook HMAC-SHA512 verification now operates on the exact raw request bytes before JSON parsing. Missing or invalid signatures receive 401. New payments require matching live/test mode and a positive safe integer amount; the existing order principal must match. Where the customer paid a provider surcharge, authenticated provider data must explain the exact difference. This is verification of an actual charge, not a manual checkout fee calculation.

Unknown signed references create no orders. Already-paid references return 200 without a second verification or fulfillment transition. Concurrent callbacks and webhooks use a conditional D1 payment update and a unique allocation token within one transaction. Stock changes, payment evidence and now payment-event insertion all depend on the winning token. This closes duplicate payment-event logging under concurrency. CRM totals come from orders, not the count of notifications.

Successful stocked orders enter `processing`. Expired/cancelled reservations or unavailable stock enter `paid_stock_review` to avoid overselling. Email outbox keys deduplicate notification delivery; scheduled `recoverPaymentEmails` repairs missed enqueue operations. No automatic courier purchase is introduced.

## Exact implementation locations

| Boundary | Code |
|---|---|
| Central admin gate | `worker/index.ts`, before `apiAbuseGuard` and `boundedApiRequest` |
| Signed identity and route role validation | `lib/admin-auth.ts`, `adminAuthStateFromRequest` |
| Server-side role lookup | `lib/staff-role.ts`, `staffRole` |
| CRM owner gate before reads/writes | `app/api/admin/crm/route.ts`, GET and POST |
| Database delivery selection | `app/api/checkout/route.ts`, `getCommerceSettings`, `shippingQuote`, `resolveShippingSelection` |
| Database product prices and integer total | `lib/store-db.ts`, `createPendingOrder` |
| Saved-order amount at initialization | `lib/checkout-payment.ts`, `startCheckoutPayment` |
| Paystack payload, integer check and HMAC | `lib/paystack.ts` |
| Signed webhook, lookup, duplicate handling | `app/api/payments/webhook/route.ts` |
| Atomic paid transition and event/stock guards | `lib/store-db.ts`, `markOrderPaid` |

## Secret scan and production configuration

Scanned 8,852 tracked paths, including 871 decodable text files, and 501,239 lines of all locally available git history. No matching private Paystack keys, private-key PEMs, AWS access-key IDs, GitHub tokens, credential-bearing database URLs or JWT credentials were found. Credential filename search found only `mobile/.env.example`. Source credential-assignment checks found no hardcoded production credential. Tests use clearly synthetic keys. These checks are not proof against every possible secret format, and do not inspect unavailable remote history or provider-side access logs.

This deployment uses Cloudflare Workers secret bindings through `runtimeEnv()`, not `process.env`. D1 is the `DB` binding and R2 is `BUCKET`; neither needs a database URL or storage access key in the client. Existing Firebase public configuration is not a private administrator credential. No private values were printed or changed during this audit.

Configure these in **Cloudflare → Workers & Pages → vanta-noir-api → Settings → Variables and Secrets**. Names below were checked against deployed secret metadata; values were not retrieved.

| Secret name | Purpose | Present in production secret metadata |
|---|---|---|
| `PAYSTACK_SECRET_KEY` | Initialize, verify and authenticate Paystack webhooks | Yes |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase server administration / push | Yes |
| `ACCESS_EVALUATION_SIGNING_JWK` | Access evaluation signing | Yes |
| `RESEND_API_KEY` | Transactional email | Yes |
| `GA4_OAUTH_CLIENT_SECRET` | Connected analytics OAuth | Yes |
| `SHIPBUBBLE_API_KEY` | Live courier API | Yes |
| `SHIPBUBBLE_TEST_API_KEY` | Courier sandbox | Yes |
| `TERMINAL_AFRICA_LIVE_SECRET_KEY` | Live Terminal Africa integration | Yes |
| `TERMINAL_AFRICA_TEST_SECRET_KEY` | Terminal Africa sandbox | Yes |
| `APP_CARD_ENCRYPTION_KEY` | 64 hex characters for saved-card token encryption; required only when enabling saved cards | No |
| `TERMII_API_KEY` | SMS verification; requires sender and base URL too | No |
| `COURIER_WEBHOOK_SECRET` | Generic courier webhook; separate from provider-specific integrations | No |
| `GA4_SERVICE_ACCOUNT_JSON` | Alternative to analytics OAuth | No; optional with OAuth |
| `RESEND_WEBHOOK_SECRET` | Environment override for email webhook signature verification | No; existing code also supports encrypted admin-managed configuration |

Do not overwrite working secrets merely because they appear in this list. Optional integrations must remain disabled until their own credentials and configuration are ready. There is no separate Paystack webhook secret variable: Paystack's secret key verifies that signature.

Required nonsecret admin settings: `ADMIN_EMAIL`, `AUTH_PROVIDER=cloudflare-access`, `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`. Routing settings: `STOREFRONT_URL`, `ALLOWED_ORIGINS`. Email: `EMAIL_FROM`, `EMAIL_REPLY_TO`. Optional SMS: `TERMII_SENDER_ID`, `TERMII_BASE_URL`. Firebase project IDs and GA4 client/property IDs are identifiers, not private keys. Feature flags must match the integrations actually enabled.

## Validation

New access tests exercise real route handlers in an isolated Worker with D1 and signed test JWTs. Payment regression tests cover concurrent callbacks/webhooks, raw-body tampering, missing signatures, unknown references, live/test mismatch, invalid amounts, frontend total tampering, exact backend initialization amount, provider-confirmed surcharge handling, stock allocation and automatic processing.

No live charge, refund, email or courier booking is performed by these tests. No Play Store publication or new mobile binary is part of this backend release. Existing app and website clients use the same secured backend.
