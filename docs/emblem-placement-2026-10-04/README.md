# Approved emblem placement update — 4 October 2026

Published 28 replacement gallery images to the existing Vanta Noir store after approval to keep the back-emblem design. The rejected wording-only back concept is excluded.

- Hooded Performance Tracksuit, Stand Collar Performance Tracksuit and Windbreaker: add the spire on the wearer-right sleeve, opposite the existing wearer-left chest emblem. Keep the back spire and VANTA NOIR wording, chest branding and trouser branding.
- STEALTH: remove the outer-right-thigh side emblem from trousers; retain hoodie front, back and sleeve branding and rear-pocket label.
- Four colors for each product: Jet Black, Charcoal Grey, Dark Burgundy, Deep Olive/Black.
- Existing back and left gallery views remain unchanged. Corrected right-side shots use the approved continuous studio background.

All 28 public replacement images were downloaded and matched against their SHA-256 values. The guarded SQL changed 28 gallery rows and three primary image URLs; the live catalog also derives 12 updated colorway images. All 43 image URL changes match the manifest. Affected products have no other changes. Checkout and merchandising settings remain unchanged.

During this task, 19 stock fields on three unrelated products changed independently. Those values were preserved; this update only writes image URLs.

`image-corrections.sql` records the applied, old-URL-guarded updates; `rollback.sql` reverses only these image changes using new-URL guards. `image-manifest.json` maps each individual asset. Images are retained on the existing media service and in the accompanying approved-images archive. No frontend build or Worker deployment is needed for these live catalog images.
