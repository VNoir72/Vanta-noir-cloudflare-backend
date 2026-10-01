# Admin save and stock feedback update

Prepared on 1 October 2026 from `vanta-update-30` at `4322614`.

## Behaviour

- Saving an existing product or creating a new product closes Product Studio after the server returns the saved product. The products list updates immediately and a success message appears.
- A failed save leaves the editor and entered values open for correction.
- Inventory/analytics refresh failures after a successful save show a separate refresh warning. They do not incorrectly report that the product failed to save.
- Settings remain on the settings page. A persistent status shows “Settings saved.” and changes to “You have unsaved changes.” when the saved values are edited again. A failed background refresh preserves the form and offers Retry refresh.
- A colour with no available sizes shows a disabled “Sold out” button in the product page and Quick shop. Size controls remain usable for the existing restock-alert flow. Preview products retain “Coming soon”; loading and unavailable-catalogue messages retain priority.

This update does not change inventory, prices, delivery policies, payment credentials, order settings, or database structure.

## Validation

- TypeScript check and all 59 existing automated tests passed.
- Backend build and `verify:release` passed against an isolated local Worker and test database.
- Simulated React DOM checks passed for product update, creation, failed save with retained values, and successful save with a failed secondary refresh.
- Simulated React DOM checks passed for settings confirmation/unsaved feedback, preserved settings after refresh failure, and sold-out/available colour and size selection.
- Storefront build and verification passed: 697 rendered pages, 20,935 local links/assets and 682 product pages.
- No production payment, email, database write, or private admin session was used in these checks.

## Deployment

The admin is served by Cloudflare. Uploading a ZIP into Namecheap `public_html` does **not** deploy the admin changes.

After merging the pull request into `vanta-update-30`, update the Codespace checkout on that branch, then build and deploy the Cloudflare backend:

```sh
git fetch origin
git switch vanta-update-30
git pull --ff-only origin vanta-update-30
npm ci
npm run build
npm run verify:release
npm run deploy
```

If Git reports local changes or refuses the switch/pull, preserve that work and resolve it before continuing. No database migration, catalogue import, stock reset, or launch-setting change is required.

The sold-out storefront change separately requires `npm run build:storefront` and `npm run verify:storefront`, followed by uploading the resulting HTML and assets into the existing Namecheap storefront. Keep the existing image files and hosting configuration. The checkout/receipt update is included in this source branch.

After deployment, check one authorised product edit in the admin: save, confirm the editor closes, and reopen the product to confirm its saved value. Check an unavailable colour on the storefront for the disabled Sold out button. Local verification does not establish that the changes are live.
