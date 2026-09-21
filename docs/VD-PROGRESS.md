# Vanta Noir — VD progress, 21 September 2026

Working edition, release 0.3.2. The entire VD collection is not yet complete.

- 682 integrated products, 927 colourways and 2,781 depicted front/back/side views.
- 205 products added since the previous downloadable packages: 197 restored from the recovered source and eight newly reviewed outerwear designs.
- The eight new products cover ten source entries, with two documented duplicate aliases, and add 24 individual gallery images.
- 491 source reference entries remain unresolved. These include colour, construction and artwork alternatives; they are not a count of unique designs.
- Manufacturer catalogue: 1,708 pages; all included products have image pages and proposed garment measurements or accessory dimensions.
- The website and PDF share VN-MEAS-02. S, M, L, XL and XXL values are proposed sampling targets, with the original 39 guide blocks preserved. Manufacturer sample approval is still required.
- Tiny insignia and absent views are visual interpretations of low-resolution references. Approved vector artwork and construction details are needed for production.

## Newly integrated outerwear

| VD source | Product |
|---|---|
| p05-3:R5:C1 | Coach Jacket |
| p05-3:R5:C2 | Rib-collar Bomber Jacket |
| p05-3:R5:C3 | Varsity Jacket |
| p05-3:R5:C4 | Hooded Convertible Shell Jacket |
| p05-3:R5:C5 | Diamond-quilted Vest |
| p05-3:R5:A2 | Contrast-collar Coach Jacket |
| p05-3:R5:A4 | Snap-front Panel Coach Jacket |
| p05-3:R5:A5 | Zip-front Carbon Coach Jacket |

Aliases: p05-3:R5:A1 → C1; p05-3:R5:A3 → C4. A4 and A5 remain separate because their front closures differ.

## Remaining boards

| Board | Collection | Unresolved source entries |
|---|---|---:|
| p07-2.png | Batch 2 — Unisex Sport & Motion | 30 |
| p07-3.png | Mens Denim & Workwear — Batch 3 | 22 |
| p08-2.png | Batch 3 — Unisex Denim & Workwear | 50 |
| p08-3.png | Street Art Capsule 02 — Mens | 11 |
| p09-3.png | Batch 4 — Mens Pattern & Street | 33 |
| p10-2.png | Batch 5 — Unisex Elevated Street & Outerwear | 40 |
| p10-3.png | Batch 5 — Mens Elevated Street & Outerwear | 50 |
| p11-2.png | Batch 4 — Unisex Pattern & Street | 39 |
| p12-2.png | Art Capsule 01 | 45 |
| p13-2.png | Batch 4 — Womens Pattern & Street | 50 |
| p13-3.png | Art Capsule 01 — Mens | 49 |
| p14-3.png | Street-Art Capsule 02 — Womens | 10 |
| p15-2.png | Street-Art Capsule 02 — Unisex | 25 |
| p15-3.png | Womens Denim & Workwear — Batch 3 | 37 |

## Validation and deployment

The compiled backend passed catalogue import, zero-stock defaults, CORS, protected admin access, upload and media retrieval checks in an isolated environment. Full measurement tests and TypeScript checks passed. The PDF was checked for out-of-page and overlapping text, and representative pages were visually reviewed.

The downloadable ZIPs are prepared for the existing Namecheap and Cloudflare setup; preparing them does not deploy to those accounts. Follow Vanta-Noir-Integrated-Setup.md. The private inspection site uses separate Sites hosting.

Measurement dataset SHA-256: `79b52bc196430c509e741900aa7fde5e6ed677d948a80442579eba1a401862be`.
