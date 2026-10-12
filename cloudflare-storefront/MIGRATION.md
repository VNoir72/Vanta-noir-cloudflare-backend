# Vanta Noir production storefront migration

Prepared 2026-10-12. Not deployed or attached to the live domain.

## Implementation

Production Worker serves the tested storefront export, checks live product publication, retains canonical product metadata and a publication-filtered sitemap, redirects HTTP/www to HTTPS apex, retains the existing admin URL, and sends browser business API calls to https://api.vantanoir.store. Preview restrictions and banner are removed from production only. Direct PHP/source requests remain blocked. The browsing preview remains separate.

Do not deploy the preview adapter to the production domain. `wrangler.jsonc` in this directory includes production routes: deploying this configuration is the live cutover, not a staging action.

## Verification

- 19 checkout/shipping/config/backend integration checks passed using isolated test databases/provider fixtures.
- 2 production-adapter tests passed: hostname/API/admin routing, storefront configuration, published-product indexing and PHP blocking.
- Previous responsive run: 18 phone/tablet portrait/landscape layouts, 162 dialog rotations, no runtime errors.
- Previous PHP.wasm execution: 9 requests passed.
- Live end-to-end customer sign-in, shipping quote and payment callback checks still require a test customer and provider test credentials. No live charge, courier booking or customer email has been sent.

## Observed DNS and rollback

Cloudflare zone: dbc13094f98c392f79a075f57471fe4e.
Apex A: 66.29.137.179, proxied. www CNAME: vantanoir.store, proxied.
Zone Workers routes were empty at review. Leave these DNS records and Namecheap hosting available during cutover; Worker routes can intercept storefront requests without deleting the old origin. Rollback removes only the two new storefront routes after comparing their IDs and script names. Do not remove API custom domains or unrelated routes.

Existing incoming email uses mx1-hosting.jellyfish.systems (5), mx2-hosting.jellyfish.systems (10), mx3-hosting.jellyfish.systems (20). Mail/cPanel service records remain on 104.207.79.61. Root SPF currently authorizes Namecheap hosting. Preserve existing Resend records.

## Zoho handoff

User is signing up independently. Use Zoho Mail business email with existing domain vantanoir.store. Obtain the account-specific domain verification TXT record and regional MX/SPF/DKIM values from Zoho's setup screen. Do not guess these values. Verify the domain and create owner/support mailboxes before replacing existing MX records. Check whether any existing Namecheap messages need migration. Merge authorized SPF senders into one SPF record and preserve the existing automated-mail configuration.

Do not change owner/admin identity or grant staff access until the new mailbox is verified and the intended support user is confirmed. Existing backend already supports a restricted support role; mailbox creation alone grants no dashboard access.

## Domain registration

No domain transfer initiated, no registrar payment, no Namecheap cancellation. Earlier agreement was to keep registration at Namecheap while moving storefront hosting to Cloudflare. User's latest wording says Cloudflare; resolve this wording before any paid registrar action.
