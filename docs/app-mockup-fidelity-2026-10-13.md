# Android mockup alignment revision

Reference: the conversation titled “Continue Android Update”, without “chat” in its title. Preserve tech green #00ff66. Base: dfadd187a17d28b83a36944041000d3db7c3757d on codex/cloudflare-storefront-preview-2026-10-12.

## Reference boards inspected

- 42101A4D-22EE-4D8D-9D04-9717BACC2FE5.jpeg — authentication, security, support.
- A7529966-CEA5-4E87-ACD2-52AB1CA35536.jpeg — account, settings, addresses, notifications.
- 07FDC02B-9879-48A5-B200-6E5A69465F44.jpeg — coupons, calendar, about, information.
- 565A2987-3189-4308-94E8-F36FFE86DEA8.jpeg — checkout, payment methods, confirmation, tracking.
- F3EBEF5C-5AEC-4606-8800-2D8330C250D5.jpeg — Circle light/dark. Owner accent controls are separate from the customer app.
- IMG_3488.jpeg — compact transfer payment screen.

## Changes

Shared neutral light/dark palette, branded headers and five-tab navigation. Compact grouped account rows, settings cards, address editor, coupon/notification segments and security state cards. Authentication uses the ribbon header and rectangular controls. Checkout/payment methods use grouped summary cards. Transfer payment uses a compact account block, inline expiry, copy control and waiting state. Payment confirmation retains the tappable bag/receipt interaction. Tracking uses a connected vertical timeline. Circle uses a membership card, grouped benefits and management rows. Support prioritizes popular topics and a compact contact form. Calendar uses a navigable week strip with real drop indicators.

Payment, order, membership and account actions remain connected to existing callbacks. Screenshots are component previews with sample data, not evidence of live purchases. No support messages or customer data mutations were made during QA.

## Validation

- TypeScript and Expo lint pass.
- Existing design-behaviour tests pass (currency selection and safe fulfilment stages).
- Android Hermes bundle export passes; this is not a signed APK.
- Eighteen component screenshots across light/dark rendered without page errors or horizontal overflow.
- Thirty-two browser viewport/theme checks pass across payment, settings, support and calendar at widths 320, 390, 768 and 844.
- Browser interactions verified coupon tabs, theme changes, signup fields, password visibility and receipt reveal. Native checked state is not exposed as aria-checked in the browser fixture; the selected icon changed correctly.
- Temporary preview routes and layout replacement are excluded from production changes.

## Remaining acceptance work

A signed Android build and real-device review remain pending: EAS CLI is not authenticated in this environment. This revision must not be described as already installed or deployed.

Decorative ribbon artwork is retained where the boards show photographic fabric. About/information artwork and the calendar product-image composition still require final matching assets/layout work. Shop/product screens have shared styling updates but have not been validated against a separately recovered approved board. Do not claim pixel-perfect parity across the entire app.

The payment action says “Leave payment”, rather than claiming cancellation: the current service has no verified cancellation endpoint for that transfer. Existing change-method and verification behaviour is preserved.

## Bag and authentication correction — October 14

User clarified that the bag must be the realistic shopping bag from the payment mockup, and that sign-in artwork must cover the entire screen, not a banner. Replaced the drawn bag with a transparent photographic asset (charcoal, tissue paper, curved handles, tech-green wordmark and gusset). The actual receipt is one sheet emerging from behind the bag; the duplicate miniature receipt is removed. Added a full-screen pearl landscape backdrop behind all authentication content, with a dark-theme overlay, and removed the isolated ribbon banner.

Built-in image generation was used with the approved boards as references. Production assets: mobile/assets/receipt-shopping-bag.png and mobile/assets/auth-landscape.png. Prompt specifications: reproduce only the reference payment bag as a transparent cutout, replacing gold with #00ff66; reproduce only the first sign-in phone background as a portrait pearl liquid-glass sky with charcoal mountains and reflected water at the bottom, no baked-in UI/text. These are generated recreations, not extracted original artwork.

Browser verification: one receipt sheet, closed/open/replay behaviour, light/dark, reduced motion, sign-in fields and signup at 320px and landscape 844px, no page errors. Typecheck and lint pass. Source remains local/preserved as a downloadable update; public repository upload is blocked pending explicit approval after automatic review rejection. No signed APK or deployment is claimed.

## Confirmation-screen structure correction

Restored the payment mockup section order: realistic bag, outlined confirmation mark, heading/subtitle, four-row summary, collapsible item list with live catalogue thumbnails, dark View order button, underlined Download receipt action. Removed the receipt screen bottom tabs and duplicate Share receipt/View my orders buttons. The order button filters to the specific receipt reference. Bag tapping still reveals a single receipt sheet.

Payment channel is captured from the successful checkout when the receipt payload omits it; historical receipts without a channel display an em dash rather than inventing a payment method. New expo-print/expo-sharing modules generate a native PDF and open the device save/share destination chooser. Web downloads an HTML receipt. This requires a new native build and has not been verified on-device. Existing consent to save a payment card remains available only when the service explicitly offers it.

Final light/dark browser checks passed for collapsed/expanded items and bag reveal, including reduced motion. Screenshot uses sample order data and sample garment thumbnails; production maps thumbnails to actual purchased variants. Typecheck, lint and Android bundle export passed. The source has not been published or installed.

## Receipt actions after the bag reveal

Added an action sheet that appears only when the bag-to-receipt animation completes: Tear receipt, Download and Save. Tearing animates the paper separating, then offers Download/Save; it does not delete or mutate the order. The options can be dismissed and reopened, and the bag interaction can be replayed. Reduced-motion mode reaches the same states without the movement. The unopened confirmation layout is unchanged from the preceding mockup correction.

On Android, Download requests a user-selected folder and writes a generated PDF there; cancelling the folder picker creates no file. Save opens the native file sharing/save chooser. Browser fallback downloads the HTML receipt or invokes file sharing where supported. No success claim is made for a dismissed sharing chooser.

Three automated export tests cover cancellation, chosen-folder PDF writes, escaping receipt data, and save-chooser behaviour. Browser tests cover prompt-after-reveal, tear, download, options reopening, reduced motion and dark mode. Typecheck/lint and Android export passed. A real-device signed build is still pending; native file pickers were tested through mocks, not on Android hardware.


## Recovered keyframes and broader correction — October 14, latest revision

This section supersedes the earlier confirmation-screen interpretation. Recovered the generated `VANTA NOIR checkout and receipt preview.png` board dated October 13 22:06, plus the account, authentication, extras, Circle, discover/shop and product/filter boards. The receipt keyframes explicitly show tap → narrow paper rises behind the bag → paper expands in front, leaving the bag visible behind. The closed confirmation shows a Tap bag to view receipt row and bottom navigation, not an item list and standalone download link.

Implemented that layering/scale sequence, a compact receipt with actual item images and totals, and the already requested tear/download/save prompt. Restored bottom tabs. Sign-in retains full-screen landscape artwork, dark primary action, and a separate plain registration page; consent remains required for account creation. The live 12-character password requirement is retained rather than copying the sample board’s 8-character text.

Broader changes: compact account rows; secondary settings behind More settings; Circle fabric image; About fabric/photo and text composition; Information packaging image; compact support topics/form; coupon ticket rows and eligible-item browsing; calendar product imagery and real reminder switch; notification cards and functional push switch; brand/search header, recent searches, collections, product-card saves/sizes, saved-to-product flow, radio/color/price filters, product details and size-table view; bag item cards/summary; compact checkout and payment amount card; smaller tracking-reference/last-update rows. Restored bags now select their existing items initially so checkout does not incorrectly display zero. Individual bag deletion preserves other selected items.

Assets `mobile/assets/brand-fabric.png` and `mobile/assets/brand-packaging.png` were recreated with built-in image generation from the About/Information reference insets. Prompts requested only the original inset composition, black technical fabric with silver VANTA NOIR embroidery, and black presentation packaging with tissue and branded envelope; no phone/UI/gold. These and the existing bag/background assets are generated recreations, not original extracted pixels.

Local validation: TypeScript and lint; five behaviour/export tests; actual app browser journey across home/search/collections/filters/product/size guide/saved/bag/checkout/payment method using intercepted fixture data, without submitting a payment; separate account/auth/support/receipt renders; receipt prompt, tear, download, reopen, reduced-motion and dark-mode interaction tests. A web-only notification-listener error discovered by this journey was guarded from calling the native API. QA fixtures are excluded from production source.

Acceptance remains open. Browser renders do not prove native pixel parity. Native card SDK UI, receipt PDF/pickers, and font/layout rendering still require an installed Android build. Historical order APIs do not expose delivery addresses/payment channels, so those cannot be truthfully filled from sample data. The mockup’s separate per-category notification toggle and social links need actual service/config support; the app keeps functional controls rather than inventing state or destinations. The measurement illustration and exact original photographic assets remain differences from the static board. Do not claim every detail has reached exact parity or publish on that basis yet.

Build access: prior Expo sign-in was through the `expert adventure` GitHub Codespace. That workspace is reachable but is in Restricted Mode and prompts Trust Folder & Continue before terminal execution. Browser confirmation rules require user confirmation for enabling that execution. No credentials were read and no signed APK, EAS update, or public GitHub upload was performed. Next: authorized workspace trust, isolated checkout preserving its uncommitted work, verify `eas whoami`, create an internal Android build, compare native renders, finish remaining differences, then publish only after acceptance.
