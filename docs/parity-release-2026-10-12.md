# Web/app parity release 0.1.13

Customer-authorized release after reviewing the two product-page references and motion videos.

Changes: compact web settings with the app's Ionicons artwork and section navigation; profile/address/order controls retained; currency, playback, notification/privacy/help and app-benefit panels; matching app settings icons and transitions; one shared featured-product artwork rule; responsive product introduction, garment benefit icons and delivery/fit/support links on both platforms; native product columns use actual sheet width; button reactions, numeric value transitions and branded web loading states. Existing native glass blur and reduced-motion behavior retained.

Validation: 235 regression tests, 234 passed, none failed, one PHP-dependent skip. Root/native types and Expo lint passed. Android production JavaScript export succeeded locally. Static website verification passed for 698 pages and 25,172 links/assets. Compiled backend release checks passed for admin authorization, field concurrency, customer enquiries, stock and payment-related calculations. Browser fixture uses actual web product component with sample data; all five tested viewport sizes had no horizontal overflow, and size selection/add-to-bag worked. Settings profile panel passed five viewport sizes.

Limits: these browser checks are not physical Android/iPad/Safari testing. No real payment or customer notification was sent. Namecheap access was restricted in the prior attempt; installing the website ZIP remains separate from the Cloudflare backend deployment. Firebase custom auth domain and optional SMS verification are not part of this release. App-only access still depends on configured verification; no campaign was silently enabled.

Cloudflare upload succeeded with deployment id c587590e4fbd40eea60fbe614e5bde1e. Existing secrets, D1, R2 and observability preserved. One APK build is to use the final pushed revision; do not cancel/restart a build for optional visual changes.
