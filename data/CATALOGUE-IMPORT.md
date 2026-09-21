# Catalogue update — 20 September 2026

Source: Vanta-Noir-Product-Catalogue-and-Prices(1).xlsx. The original workbook is unchanged.

69 products represent all 53 spreadsheet pricing types across 22 categories and five menu sections. Existing four product IDs, prices, variants and inventory remain intact. Their spreadsheet suggested prices appear in the admin product editor for review. New product prices use the Suggested NGN column and remain proposed.

20 named designs from the finished 01–20 store-image PDFs provide 300 clean front/back/side images across five colourways per design. These are embedded image assets extracted without PDF page labels, not screenshots of design boards. Other product types use individual reference-based renders or new accessory concepts, with two colourways each. Core sets have four garment-only colourways. These generated images are design previews, not photographs of manufactured stock.

The mapping file records the reference for each design. Representative designs cover the spreadsheet ranges; this update does not claim to import every numbered historical batch. Images are stored under public/images/catalogue/. Built-in image generation prompts requested isolated full garments or complete sets on neutral off-white studio backgrounds, preserving reference cut, trim and branding. Alternate prompts changed only colour while keeping the same product and composition. No CSS recolouring is used.

New products are visible but cannot be ordered: stock starts at zero, availability is Design preview, and price status is Proposed. In Admin → Products → Edit, review the product, confirm the selling price, set Price approval to Approved selling price, choose Ready stock or Preorder, enter confirmed size/colour stock and dispatch information, then save. The checkout enforces preview and price approval on the server. Socks and belts use Size pending until fit is confirmed; bags, hats, scarves, eyewear and bottles use One size. Clothing uses S/M/L/XL/XXL. Do not invent measurements.

The 0006 data migration inserts new records once and changes only the known legacy category/image fields of the core products. It does not reset stock, orders, customers, or merchant-uploaded image URLs. On an existing Cloudflare backend, back up D1 then run db:migrate before deploying; do not re-import a fresh catalogue. The standalone catalogue import is only for an empty store.

## Brand line update

The approved brand line is **Presence. Power. Precision.** It replaces both Presence by Design and the earlier athletic slogan throughout storefront branding and affected garment mockups. Existing logo-only garments remain logo-only. Corrected images use new -ppp.webp URLs to avoid stale browser caches. Migration 0007 updates only exact known catalogue image paths; it preserves prices, inventory, categories and merchant-uploaded images. The image mapping and review manifest record the affected views.
