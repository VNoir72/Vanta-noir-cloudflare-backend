# Floating catalogue release preparation — 6 November 2026

The read-only preview serves the production storefront build with a snapshot of the public API: 763 products and 1,029 colourways. It never forwards mutations to production. Checkout, subscriptions, account writes and admin uploads are unavailable in this preview. Refresh its public data with `npm run preview:snapshot`; build the storefront before `npm run dev`. Use `npm run dev:backend` for the original local backend development server. `/__preview/mobile` provides a 390px mobile-web viewport.

## Customer experience

Shop, category results, Collections, saved items and owner-approved Looks use the floating catalogue. The central garment opens its own product page; neighbours, arrows, swipe and the product selector browse the catalogue. Colour choices link to the same colour in product details. Product pages retain individual studio views, stock/preorder restrictions, size guidance and Notify me behavior. New controls use existing backend accent variables. Reduced-motion settings disable the sway and carousel transitions.

Collection groups use existing collection metadata. Looks and Wear it together resolve only explicit `pairedProductIds` against the published catalogue. A named look requires an accessible companion. No outfits have been invented or published, and a styling relationship does not create a discounted bundle or change inventory. Existing products sold as sets keep their existing contents and sales rules.

## Prepared garment assets

The separate **Vanta-Noir-Transparent-Garments-2026-11-06.zip** (delivered privately in the task conversation) contains 1,029 full-resolution lossless WebP files, covering all 763 published products and their current colours. Extract it into the repository root to populate `public/images/floating/`. Large binary assets are delivered as this release pack rather than added to Git. `data/floating-assets-manifest.json` records product/colour/source relationships, original and output checksums, dimensions and processing methods. `lib/floating-assets.json` is the small runtime lookup.

Asset pack SHA-256: `ae24859e7fde86d26db854b2a08363bd14ce64f7fb27f19467c25956141f2dea`. Size: 269,727,216 bytes.

Only alpha was changed. Automated comparison checked every visible RGB pixel against its source; original studio files were not overwritten. All assets received contact-sheet review, with additional refinement of nonuniform backgrounds. This preserves existing artwork rather than regenerating logos or garment designs. Fine-edge masking is not a new product photography or physical garment validation process.

The storefront selects the prepared cutout only when the current colour's source URL matches. Replacing the source URL invalidates the prepared fallback. An admin's exact-colour `details.displayImages` entry takes priority. New uploads without a prepared transparent image retain their studio photograph until the transparent display image is supplied.

In the product editor, open **Wear it together & floating display**, select a colour, upload a transparent PNG/WebP, then save the product. The upload checks for transparent background and visible content, uses the existing authenticated media endpoint, and shares the editor's upload/save lock. Studio views stay in the existing imagery controls. This is a transparent-asset upload workflow, not an automatic background-removal service inside the admin.

## Validation and packaging

`node scripts/assets/verify-floating-assets.mjs` verifies every asset checksum and mapping. Both builds call this check so a release cannot silently omit the external garment pack. Run:

```sh
npm run typecheck
node --test tests/product-pairings.test.mjs tests/catalog-browsing.test.mjs
node portable/build.mjs --reuse-images
node portable/verify-storefront.mjs
node portable/build-backend.mjs --reuse-images
```

The `--reuse-images` flag skips re-optimizing the existing studio library. The build still copies the new full-resolution transparent assets. Deploy the complete assets directory, not a code-only connector release retaining the old image binding. The prepared output is `outputs/namecheap` for the storefront; backend output follows `wrangler.deploy.jsonc`.

The offline preparation utilities are under `scripts/assets/`, with pinned Python requirements. To recreate candidates from the original public sources: restore sources, prepare cutouts, refine nonuniform sources, combine masks, then apply reviewed shadow cleanup. Re-run visual review after any regeneration; image checksums deliberately lock this reviewed asset pack.

## Switch sequence and rollback

This change is staged in PR #85, not deployed to production. Mobile app code and OTA remain unchanged.

1. Restore the garment pack into the exact PR checkout and run the checks above.
2. Confirm the intended source baseline against the currently deployed backend and storefront. The PR starts from audit commit `69ede6cfd4ae54fb060e9b47a8514502c2c63ca9`; do not replace unrelated newer fixes.
3. Capture the current Worker versions and settings. The latest read-only check still showed storefront deployment `8565d398-38f4-4b66-82d3-7fde3e835275`, version `68eedaf5-40a0-4dc3-93c4-c39911d0651a`, at 100%.
4. Deploy the backend/admin build first, preserving existing bindings, secrets and routes. The optional product-detail fields are backward compatible and require no catalogue rewrite. Verify an owner can save a transparent display image and pairing on a non-public test product before enabling the new storefront.
5. Deploy the complete storefront build to `vanta-storefront`, including the new binary assets. Verify catalogue, categories, colour selection, product opening, original views, saved products, and mobile browsing. Keep preview restrictions/preorders intact.
6. If customer browsing regresses, restore the captured storefront version. The optional display/pairing fields can remain stored; the previous storefront ignores them. Restore the captured backend version separately if its admin changes regress. No database migration or stock mutation is part of this release.

Validation passed: TypeScript, 12 focused tests, both production builds, storefront route/asset/privacy checks, and the compiled backend suite against isolated temporary D1/R2 (including authenticated upload/read/cache). Homepage startup JavaScript is 1,475,176 bytes, below the existing 1.6 MB budget.

Local browser verification covers catalogue loading, original product imagery, colour-specific product links, collection entry and responsive preview. No payment, order or subscription was submitted. Authenticated live-admin upload acceptance and production deployment remain switch-time checks. Exact animation matching against the earlier videos and installed-app behavior are not certified by these website checks.
