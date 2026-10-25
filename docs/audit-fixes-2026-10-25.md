# Production audit repairs — 25 October 2026

Release branch: `fix/audit-and-accent-2026-10-25`, based on stock-reporting repair `98c6df85be88dd7e0414ee12d1ea483c28f86d53`.
This branch is the source baseline for this repair. The repository's old `main` is not a production deployment target. Do not publish it over the live site.

Changes:
- Include products with sales in All; Best sellers retains its own selection and ranking.
- Inject the saved public storefront accent into the HTML head before paint, with escaped public settings for hydration. Keep a neutral fallback when settings cannot load; never overwrite the saved accent with defaults during mount/unmount.
- Show neutral loading messages while public order/delivery settings are unknown.
- Preserve the live checkout-only Paystack CSP permissions in the source adapter.
- Add RFC 8058 POST unsubscribe support and headers for eligible marketing messages; keep confirmation requests and transactional mail separate. Existing consent and queue rechecks remain in place.
- Run isolated verification for all pull-request targets, rather than two obsolete branches.

Validation: 306 tests, 305 pass, one existing skip, no failures; website TypeScript passes. Four complete generated-page/asset smoke checks pass. No native app dependency, fingerprint, signing credential, catalogue publication or inventory quantity changed.

Deployment:
- Previous storefront version: `a03a32ee-e4d6-4978-9844-72677fd5f0af`.
- Previous backend version: `7b913f6d-ceb0-4162-ad87-449b77c65687`.
- Connector asset uploads require a separate upload JWT that this connection cannot use. `scripts/maintenance/prepare-connector-storefront.mjs` packages generated text assets in a versioned Worker module, preserving existing bound assets for unchanged binary/legacy paths. The normal Wrangler asset deployment remains supported.
- Backend deployment replaces only the existing outbox sender and subscription route modules, plus their two pure helper modules; all other deployed modules, assets, bindings, secrets and runtime settings are retained. Each replacement is checked for exactly one matching compiled fragment.
- Roll back by deploying the previous corresponding Worker version at 100%. No schema changes or data migrations are part of this release.

Outstanding owner/provider work: Shipbubble funding and a real tracking proof; factual confirmation of Apex Checker Cap production specifications; owner MFA-device enrollment before enforcement; a designated monitored DMARC-report mailbox and subsequent enforcement review. Fixture checks are not real payment or shipment acceptance.
