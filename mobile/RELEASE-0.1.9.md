# Vanta Noir 0.1.9

- Shared pearl ribbons, dark ribbons and particle orbits for Android and responsive web hero slides.
- Three visible slides by default. Admin > Store design > Hero: enable the optional fourth slide when needed.
- Upload campaign MP4/WebM (up to 32 MB each) to the hero playlist. Select Videos only to replace product slides with UGC or video shoots. Video slides advance on playback completion rather than a timer; a single video loops. Returning to Mixed restores the product/campaign carousel.
- Compact product details, bag, help and settings; themed confirmation dialogs.
- Recycle bin selection, restore and permanent removal from personal history. Financial/order records remain in the store database; permanent removal cannot be restored by customers.
- To pay includes unpaid/pending/failed attempts, excludes paid and terminal orders.
- Search currency by name or code. Browsing conversions depend on available current rates. Checkout remains NGN.

Validation: Android lint/typecheck/export, root typecheck, customer-account authorization and permanent-removal tests, carousel and order-policy tests, 697 static pages and local link verification, backend production build.

Publication: source update requires a new Android build and deployment of the backend/admin and Namecheap website. A source push alone does not publish any of these. Google/Apple/password authentication is not included in this release.
