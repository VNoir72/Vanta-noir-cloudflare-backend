# Additional abuse boundaries

These are shared server controls for clients using this API, not a zero-abuse guarantee. No new app build is required for these controls.

| Boundary | Limit | When reached |
|---|---|---|
| API requests per source IP, separately for admin/customer/public | 300 reads/minute; 60 writes/minute | 429 with Retry-After; unavailable guard fails closed with 503 |
| Signed-in customer routes per account | 180 reads/minute; 40 writes/minute | 429; existing tighter endpoint caps remain |
| New public checkout attempts | 8/buyer and 20/source IP per day | No new reservation; an identical existing checkout remains resumable |
| Resend messages from this backend | 200/hour; 1,000/day; 10,000/30 days | Direct sends stop; queued messages defer without losing retry allowance |
| Termii OTP sends | 20/hour; 100/day; 1,000/30 days | No provider call |
| Expo push messages | 500/hour; 3,000/day; 30,000/30 days | Updates remain unsent for a later maintenance run |
| Push token storage | 10,000 total, existing 5/customer | Refuse new devices; existing owners can refresh/remove their devices |
| API body reading | 15 seconds, existing 128 KiB / upload 33 MiB | 408 or 413 before parsing |

Provider quotas reserve capacity atomically in D1 before sending. Failures consume capacity conservatively. Windows start on first use and reset after expiry, not at calendar midnight. Multiple window checks can consume earlier-window capacity when a later window rejects; they can stop early, never authorize over the stated cap. These are operation counts, not currency guarantees: SMS pricing/segments and provider charges vary. Firebase-managed email and direct provider dashboard sends are outside these backend counters.

Emergency Worker variable `ABUSE_PAUSED_SERVICES=email,sms,push` pauses selected outgoing services. Omit services that should continue. Existing queued work is retained. No paid provider is enabled by this change.

Payment/courier/email webhook paths bypass generic customer request quotas and retain their existing signature validation, byte limits and deduplication. Media delivery is also excluded from API rate counters. Public website guest checkout remains supported; internal order creation without a public actor is outside the daily public checkout cap. The production checkout route always supplies the server-derived actor.

Residual risks: distributed actors can exhaust shared quotas and temporarily deny legitimate requests; this is the tradeoff of a hard ceiling. These controls do not cap overall Cloudflare request/D1 charges, courier bookings, Paystack transactions or Firebase usage. They do not add Turnstile, device-token attestation, customer MFA or a spending dashboard. Those require separate implementation and validation; do not label them completed by this change.

Validation: 257 backend tests passed, zero failures, one existing skip. Dedicated tests cover concurrent budget exhaustion/reset, random-path rate-limit bypass attempts, webhook independence, reservation expiry versus daily limits, deferred outbox delivery, and slow/oversized request bodies. All external sends in tests were mocked.
