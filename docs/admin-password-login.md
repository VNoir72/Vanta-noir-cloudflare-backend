# Admin email and password sign-in

The admin area now has a Vanta Noir email/password form at `/admin-login`, including password setup, email verification, password reset, and a POST-based sign-out flow. It uses the existing Vanta Noir Firebase password accounts. Customer and admin sessions are separate; only the configured owner email and active `admin_staff` members receive an admin session.

Passwords go directly from the browser to Firebase over HTTPS. The backend accepts only recent, verified password identities for the existing project, checks current provider account state and staff membership, then issues an eight-hour host-only Secure, HttpOnly, SameSite=Strict cookie. Only its SHA-256 digest is stored. Every admin request checks current role and provider revocation state. Password reset, disabled accounts, staff removal, expiry, and logout revoke access. Native mode ignores Cloudflare assertion headers and customer cookies/bearer tokens. Sign-in observations continue through the existing audit and alert system.

The login page has a nonce-based CSP, same-origin session/recovery requests, no browser credential persistence, generic password-reset responses, and existing email rate limits. No password or verification link is provisioned or sent during deployment. The account holder creates or resets their own password on the page. Password setup does not assign a staff role. This release does not add a second-factor requirement to native password login.

## Validation

- `npm test`: 307 passed, 1 existing skipped test, 0 failures (308 total).
- `npm run typecheck`: passed.
- New Miniflare tests cover verified/current identities, rejected customers, forged/foreign/stale/unverified tokens, non-password providers, strict origin checks, staff permissions, rotation, logout, expiry, revocation, provider outages, audit records, cookie flags, hashed storage and rate limits.
- JSDOM tests exercise setup and reset controls and generic reset feedback.
- The existing all-admin-route authorization audit passes.
- Firebase public client API accepts the admin hostname's Origin/Referer and rejects the deliberately invalid test token with `INVALID_ID_TOKEN`. No real credential or account change is used for that check.

## Rollout and rollback

Enable `ADMIN_PASSWORD_LOGIN_ENABLED=true` with the new backend release, preserving all current bindings and generated assets. Verify `/admin-login` and denial of invalid sessions before changing the existing Access gate. Then move only the existing Vanta Noir Admin Access application to the nonfunctional `/admin-access-retired` path, hide its launcher tile, and retain its original policies for rollback. The Worker returns 410 on that retired path; it cannot grant an admin session. No allow-everyone/bypass policy is created. Application authorization protects all admin APIs after the Access gate moves.

Original Access destinations: `api.vantanoir.store/admin`, `api.vantanoir.store/admin/*`, `api.vantanoir.store/api/admin/*`. Original domain: `api.vantanoir.store/admin`. Original launcher visibility: true. Retain both original policy IDs and their precedence from the pre-deployment application snapshot.

To roll back, first restore those Access destinations and visibility while keeping policies intact; then redeploy backend version `8f729da4-9124-4ba6-960c-bdd527c0b191`. Restoring the gate first avoids exposing the old Access-only backend without edge enforcement. Existing native sessions are ignored when native mode is disabled. No database migration is required.
