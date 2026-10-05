# Owner Google Analytics connection

The owner can connect Google Analytics from Admin → Settings → Connections with Google OAuth. This avoids service-account key creation; no organization security policy needs changing. The existing service-account reporting path remains available for installations already using it.

## One-time Google setup

Use the existing Cloud project with Google Analytics Data API enabled. Configure Google Auth Platform branding as Vanta Noir Admin, support and developer-contact email, and External audience for a personal Google account. Add the Google account that owns the Analytics property as a test user. Data Access needs only `https://www.googleapis.com/auth/analytics.readonly`.

Create an OAuth client of type **Web application**, with this exact authorized redirect URI:

`https://api.vantanoir.store/api/admin/ga4/callback`

No JavaScript origin is required for this server-side flow. Store `GA4_OAUTH_CLIENT_ID` as Worker text and `GA4_OAUTH_CLIENT_SECRET` as a Worker secret in Cloudflare. Never place the secret in GitHub, chat, a screenshot or storefront code. `GA4_PROPERTY_ID=554825546` is included in deployment configuration. Save/deploy bindings, refresh Settings → Connections and connect using an account that can read this property. Keep `purchase` marked as a key event.

External OAuth apps in Testing generally have seven-day refresh-token lifetime for the Analytics scope. Review Google's production publishing/verification requirements for lasting authorization. Publishing alone is not a promise that verification is unnecessary. No billing or verification requirements are bypassed by this integration.

## Security and behavior

Only a verified Cloudflare Access owner session can start, finish or disconnect. Start/disconnect require a same-origin POST and are rate limited. Callback uses random state, a ten-minute encrypted HttpOnly/Secure/SameSite=Lax host-only cookie, S256 PKCE, owner binding, property binding and an atomically consumed server-side state hash. A second start invalidates the earlier attempt. Denial/errors redirect to a fixed admin URL without exposing provider messages, codes or tokens. The callback sends no-referrer and no-store.

The chosen Google account is checked against the exact configured property with a read-only report request before a new grant replaces the old connection. Refresh tokens are encrypted with AES-256-GCM via JWE in private D1 metadata, using a domain-separated key derived from the Worker OAuth client secret. Client-secret rotation requires reconnecting. Tokens and callback values are never written to audit logs. Access tokens live only in server memory with a bounded lifetime; connection IDs isolate report caches between grants. Disconnect deletes local grant/state and attempts Google revocation; if revocation fails the UI explains how to remove the Google app grant manually.

The saved connection status indicates authorization storage, not proof that every future report will succeed. Property access changes, revoked or expired grants and provider outages return unavailable, never invented zero conversion. Store orders and payment status do not depend on GA4. OAuth callbacks remain behind existing Cloudflare Access protection; if an Access session expires, sign in and restart connection from Settings.

No production Google authorization has been tested until the owner configures their OAuth client and grants access. Automated tests use isolated databases and mocked Google endpoints.
