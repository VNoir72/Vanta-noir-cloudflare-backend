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


### Reviewed image batch included

49 generated and reviewed WebP assets cover 37 colourways across nine styles. All four colourways of Stealth now use the dark-burgundy R03 construction and master spire/wordmark. The other performance sets and windbreaker receive the missing right views. All five colourways of the graphic tee, fitted tee, long-sleeve tee and polo have four labelled views; the polo's existing side is Right, so its new view is Left. The Jet Black Ribbed Midi Dress also has a new Right view.

This covers every colourway of the eight styles currently marked `in_stock` with approved prices (this catalogue status does not imply positive inventory). The remaining preview catalogue is not claimed as image-complete. No stock, availability, prices, orders or payment settings were changed.

Reviewed mappings are in `data/catalogue-approved-view-updates.json`; product images are in `public/images/catalogue/approved/`. The transformation applies on catalogue reads, so these views do not require a database migration. It preserves unrelated merchant-uploaded images and skips colourways whose front was replaced by a merchant.

Optional persistence into D1, only after the frontend assets are published:

```bash
node scripts/apply-approved-views.mjs
node scripts/apply-approved-views.mjs --apply
```

The apply command first exports a database backup. It updates only known image URLs and labels. Publication is not complete until the Cloudflare Worker and Namecheap public_html package are both published.

Generation used the built-in image editor. Prompt instructions: derive the missing wearer's side from that exact colourway's Front/Back/Side references; preserve fabric, silhouette, seams, pattern, contrast panels and logo positions; use the master angular spire instead of feathered emblems; match the existing ghost-mannequin photography and background; do not mirror branding or add marks. Stealth additionally follows the R03 four-view tech pack. Generated outputs were inspected and compressed to WebP for the storefront.

## Approved delivery and field-editing release — 10 October 2026

Published source: `31cd79cb2ef8b79fc54f1f28316024198b29332f`; Android packaging correction: `e004e2d7dd3f62402a5f581d0bbd489c2905ecb4`, branch `codex/native-app-2026-10-10`.

- Website and app offer Express by default when a comparable courier estimate is clearly faster than the cheapest service, plus Standard at the actual lower fee. A single option appears if the cheapest is fastest or estimates cannot establish a faster choice. Courier names stay hidden; processing time is separate. No premium is invented.
- Native selects/toggles work directly and require confirmation. Text/number fields have adjacent Edit/Save/Cancel. Large record Edit cards and repeated order-reference headings are removed. Settings use validated leaf patches and compare-and-swap writes; tracking updates only supplied columns and can detect stale field values. Existing return, parcel and financial validation remains.
- Hero modes: products, campaigns or both; product order and campaign order/destination links are configurable. Slides support photos/videos; carousel controls are visually hidden unless keyboard-focused.
- Worker `vanta-noir-api` version `4bc47245-6a95-49c6-8c25-0fce56ed3d74` deployed at 100%, deployment `fc618be6-f218-4a1f-8e6f-b5c30fff9861`, 2026-10-10T21:40:54Z. Health verified. Live Settings confirmed individual controls; changing a hero select displayed confirmation and Cancel restored its original value without saving.
- `outputs/Vanta-Noir-Orders-Header-Update.zip`: 3,339,089 bytes, SHA-256 `6b85abb8a69f175b6fabd4edf7f0560f26de78feae07b6e8f0c29769f0415664`. The owner will extract directly into Namecheap `public_html`, overwrite matching files and retain existing product photographs. This task did not upload to Namecheap.

Validation: root/mobile typechecks; mobile lint; Android bundle export; delivery-choice and cross-client policy tests; actual React DOM field confirmation/cancel/failed-save/draft tests; full regression run (one outdated search-header expectation corrected and passed on rerun); compiled isolated Worker verification including leaf save conflict/allowlist tests; 697 static pages and 23,743 local links/assets verified. No live payments or courier bookings were made.
