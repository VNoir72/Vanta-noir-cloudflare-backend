# Vanta Noir production storefront migration

Completed live cutover on 2026-10-12.

## Live deployment

- Storefront: https://vantanoir.store/
- Cloudflare Worker: `vanta-storefront`
- Deployment ID: `ef2076ddb1614bd68326f96915780668`
- Deployment time: 2026-10-12T12:58:44.460541Z
- 712 non-image static assets uploaded. Images served through the existing backend service binding and R2.
- Bindings: ASSETS, PUBLIC_API (vanta-noir-api), PRODUCT_REDIRECTS.
- workers.dev and preview URLs disabled for production. Separate read-only browsing preview retained.

Production serves the tested storefront export, checks live product publication, retains canonical product metadata and a publication-filtered sitemap, redirects HTTP/www to HTTPS apex, retains the existing admin URL, and sends business API calls to https://api.vantanoir.store. PHP gateway behavior is handled by the Worker; direct PHP/source requests remain blocked. Production has no preview banner or forced noindex.

## Routes and rollback

Cloudflare zone: `dbc13094f98c392f79a075f57471fe4e`.

| Pattern | Worker | Route ID |
| --- | --- | --- |
| vantanoir.store/* | vanta-storefront | 1d0d619974ba4274b69260a336d8b2fd |
| www.vantanoir.store/* | vanta-storefront | e2c1160556ac41199688d2753588a28a |

Apex A 66.29.137.179 (proxied) and www CNAME vantanoir.store (proxied) were preserved. Namecheap hosting remains available as fallback. To roll back storefront hosting, first compare current route IDs, patterns and Worker names, then remove only the two routes above. Do not remove API custom domains or unrelated routes. This restores routing to the preserved origin; check the origin before rollback.

## Verification

- Production and preview adapter suite: 6 tests passed after deployment preparation.
- Previous isolated checkout/shipping/config/backend checks: 19 passed.
- Previous responsive run: 18 phone/tablet portrait/landscape layouts and 162 dialog rotations, no overflow/runtime errors. Chromium touch emulation using local exported HTML and API fixtures; not actual Safari hardware testing.
- Previous PHP.wasm execution: 9 requests passed.
- Live browser: catalogue loaded; Apex Checker Cap product page and image loaded; selected size, added to bag, verified subtotal and checkout address/payment interface.
- Live contact page displays support@vantanoir.store.
- Live account page loads its sign-in form; no authenticated sign-in performed.
- Live www redirects to HTTPS apex.
- Temporary bag item removed; bag returned to zero.
- No order/payment submitted, courier booking created or customer email sent during the cutover. Actual customer sign-in, provider shipping quotes and payment callbacks remain unverified end-to-end.

## Zoho and support

User completed Zoho setup for ajibola@vantanoir.store and support@vantanoir.store. Zoho confirmed all DNS records verified. Root MX records now point to mx.zoho.com (10), mx2.zoho.com (20), mx3.zoho.com (50). Zoho zmail DKIM is installed; one merged root SPF preserves authorized hosting senders and adds Zoho. Existing Resend records remain intact. DMARC remains p=none.

A received Gmail test message passed SPF, DKIM, DMARC and ARC, but landed in spam. User deferred further inbox placement testing. Authentication success does not guarantee inbox placement.

Live commerce_settings.supportEmail changed from vantanoir.xyz@gmail.com to support@vantanoir.store. Backend EMAIL_REPLY_TO updated to support@vantanoir.store; EMAIL_FROM and other provider secrets preserved. Owner/admin identity unchanged. Creating a mailbox does not grant dashboard access; no new staff access was granted.

## Registration and retained services

No registrar transfer, registrar payment or Namecheap cancellation performed. Domain registration remains at Namecheap; DNS and storefront run on Cloudflare, company mail on Zoho. Existing backend, database, storage, authentication, payment and shipping services were retained.
