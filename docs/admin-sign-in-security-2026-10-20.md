# Admin sign-in alerts and trusted browsers

The owner receives a transactional email when an authorised owner or staff session first accesses the admin. Unknown browsers are highlighted in the subject. Alerts include account, role, browser/OS family, approximate country, observed time and identity sign-in time when available. They use the existing durable email outbox and email service budget.

JWT signature, issuer, audience, expiry and current staff permissions are checked before observation. Unauthenticated, expired, forged or unauthorised access cannot create a successful-sign-in record. Raw assertions and browser-cookie values are not stored. Raw IP addresses are used transiently to distinguish identity sessions but are never retained in security records or email.

Cloudflare application tokens can renew without another identity-provider login. The authenticated get-identity endpoint supplies the identity sign-in timestamp to deduplicate these renewals. A per-token digest cache prevents API requests and page refreshes from generating repeat mail. If identity metadata is unavailable, the verified application session is recorded instead; this fallback can report a renewed application session separately. This monitors successful admin use, not failed login attempts or identity sessions that never reach the admin.

Every authorised staff workspace registers a random 32-byte browser cookie. It is Secure, HttpOnly, host-only and SameSite=Lax, allowing recognition on the top-level return from the Cloudflare sign-in page. Its digest, browser/OS family and associated account identify the browser. Recognition is a convenience signal, not proof of a physical computer or an authorisation credential. Clearing cookies, private browsing or another browser creates an untrusted entry.

Owners can open Sign-in security from the account menu or Store settings. The page lists the latest 100 sessions and 100 browsers. Every browser starts untrusted. Requesting trust sends a single-use random confirmation link to the configured owner email; the link expires in 30 minutes. Visiting a link does not change trust. A current authenticated owner must press Confirm trust. Trust lasts 90 days and does not suppress future sign-in notifications. Removing trust atomically invalidates outstanding confirmation challenges. Trust changes and sign-ins are audited.

Trust does not bypass Cloudflare Access, grant staff permissions, block unknown browsers or revoke an existing login. Unexpected access should be investigated through Staff & permissions and Cloudflare Zero Trust session revocation. No new access permission, secret, database migration, mobile runtime or storefront deployment is required.

The existing scheduler retains sign-ins for 90 days, removes expired challenges/token-cache entries, and removes browser records unused for a year. The first post-release observation of an already active session also generates an alert; historical pre-release sign-ins cannot be reconstructed.

