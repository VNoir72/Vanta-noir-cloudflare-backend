# Customer fixes — 0.1.11

- Removed the carousel edit caption. All featured products use the same automatic studio-backdrop removal on app and web; native execution uses a generated JavaScript string because Hermes cannot serialize functions. Keep `mobile/src/garment-cutout-script.ts` synchronized (the cutout test verifies this).
- Removal supports edge-connected light studio backgrounds and uniform coloured backgrounds. Complex lifestyle photos still require a transparent garment image; this is not AI segmentation. The image relay reads public Cloudflare assets/R2, not external URLs.
- Add to bag is independent of any previous payment. Preview products and out-of-stock sizes remain protected. Restoring recycled order items adds currently available catalogue variants to the bag, clears the old payment state and requires fresh checkout.
- Changing an unpaid payment method requires ownership and a provider status check. Successful or processing payments cannot restart; ambiguous provider errors fail closed. Late settlements on cancelled orders follow existing stock-review handling.
- Web `/account` supports Google, verified email/password, password reset and email codes. Signed-in web checkout links orders to the same customer records as Android. The browser store token lives in sessionStorage. Guest checkout remains available.
- Firebase Google/password enabled; `vantanoir.store` and `www.vantanoir.store` authorized. Apple remains off pending the owner's developer membership/setup.

## Owner administration

Use https://api.vantanoir.store/admin for both app and website. Products, stock, featured flags, orders and store design share one Cloudflare database. Firebase Authentication manages identities, not catalogue/orders.

In store design, choose featured products/campaigns or UGC/video-only mode, upload playlist media and order the featured products. The optional fourth slide remains off by default. Product/customer changes appear through the shared API; frontend code changes need a new APK or website upload.

## Website upload

Back up public_html, upload the corrected full ZIP and extract its contents directly into public_html (not a nested folder). Keep .htaccess, assets, images, account.html, store-config.js and storefront-gateway.php together. Existing product routes and publication protections remain in place.
