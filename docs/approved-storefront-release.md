# Approved storefront update

Based on the deployed `vanta-update-30` branch. The original white theme, lime buttons, category tiles and images remain the foundation.

Implemented: compact colour swatches; centred animated filters with garment-name Drop search, style collections, product types, sizes, stock and an unlimited-top ₦10m price slider; left-aligned mobile spire logo; full desktop hero and contained full-look garment; mobile hero copy over artwork; wider desktop navigation; NGN/USD display estimates (NGN checkout); four named admin image upload slots; explicit Categories & colours admin navigation; confirmed-zero-stock-only image badges; automatic recent uploads and sales-velocity ranking.

Currency display uses the documented open ExchangeRate-API endpoint with caching, a freshness limit, NGN fallback and visible attribution. No price or payment currency is changed in the database.

## Release status

Source changes are prepared separately from live deployment. A successful build or GitHub merge does not deploy the Namecheap frontend. Cloudflare and Namecheap access is required to finish publication.

The GitHub workflow verifies the backend and storefront and produces `vanta-noir-namecheap-update.zip`, containing the contents to put in public_html, including `.htaccess`.

For a signed-in Codespace after merging:

```bash
git pull --ff-only origin vanta-update-30
npm ci
npm run typecheck
npm run build
npm run verify:release
npm run deploy
npm run build:storefront
npm run verify:storefront
```

Back up public_html before uploading the Namecheap package. Extract the archive into public_html itself, not into a nested namecheap folder. Keep unrelated hosting files. Retain the previous build for rollback. Verify the homepage, filter, quick shop, product gallery and checkout after publishing both parts.

## Image audit

Run `node scripts/audit-product-views.mjs` to inventory missing and ambiguous views. The live audit found 682 products / 931 colourways; 920 use a generic side view. Do not assume all side images show the same side. Left and right always refer to the wearer. Do not mirror branding. Generated images require visual review against the approved master and garment reference before inclusion. The full catalogue image pass is not yet complete.
