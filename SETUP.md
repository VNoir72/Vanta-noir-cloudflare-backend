# Vanta Noir — update guide, release 0.3.4

Prepared 21 September 2026. These packages update your existing setup. Preparing these files has not changed your GitHub repository, Cloudflare account or Namecheap hosting.

Use this guide one stage at a time. After each checkpoint, send a screenshot if your screen differs. Cover secret values. Do not continue past an error.

## What goes where

| File | Where it belongs | What it does |
|---|---|---|
| VantaNoir-Discover-Namecheap.zip | Namecheap website document root, normally public_html | Customer storefront |
| Vanta-Noir-Integrated-Backend.zip | Your existing GitHub project, deployed to Cloudflare | Protected admin, catalogue, orders, inventory, uploads and email queue |

The backend ZIP is a complete project, not a file to paste into Cloudflare's Quick Edit box. Do not upload it to public_html. The frontend ZIP contains index.html at its root; do not leave it inside an extra folder.

This release includes the updated desktop/mobile admin and product studio, stable garment colour switching, 41 preset/custom colours, categories created from admin, provisional measurement references, responsive category cards, and branded paid-order emails. It uses your system font. The text category strip remains as in preview version 16; hiding it on mobile was suggested but has not been applied.

## Catalogue and measurement update

This working edition contains 682 products and 931 colourways, including 205 products added since the previous deployment packages. Eight of these are the newly reviewed Unisex Batch 01 outerwear designs, with 24 separate garment views. The other 197 restore previously generated VD designs. Two duplicate source panels are documented as aliases. There are still 491 unresolved VD reference entries; these entries include colour and artwork panels and are not a count of unique designs.

The full S, M, L, XL and XXL garment tables use the same VN-MEAS-02 dataset as Vanta-Noir-Manufacturer-Catalogue.pdf. The original 39 measurement blocks are preserved; additional blocks and fit adjustments are proposed sampling targets. Manufacturer sample approval is still required. Accessories show relevant dimensions instead of invented garment sizes. Edited, confirmed or intentionally hidden admin charts remain authoritative.

New catalogue records import with zero stock. Existing stock, prices and merchant changes are preserved by the incremental importer. Upload both updated packages so the storefront images and API catalogue agree.

## Stage 1 — open the existing Worker

1. Open https://dash.cloudflare.com in Safari. Use Request Desktop Website if controls are hidden.
2. Open Workers & Pages (it may be under Compute & AI).
3. Open **vanta-noir-api**.
4. Open **Settings**, then the build/repository connection section if present.
5. Check the connected repository and production branch. Pause automatic deployments before replacing files or upgrading the database. Keep the repository connection if the dashboard provides a pause/disable control.

**Checkpoint:** Send a screenshot of the Worker overview/build settings if you cannot see that control. Do not delete the Worker or create another database.

The package preserves these known resources. Compare them with your screen before any database write:

| Resource | Expected value |
|---|---|
| Worker | vanta-noir-api |
| D1 database | vanta-noir-db |
| D1 ID | db5dccad-083a-4c80-bc7c-63cba3a00a35 |
| Database binding | DB |
| R2 bucket | vanta-noir-media |
| Bucket binding | BUCKET |
| Admin/API domain | api.vantanoir.store |
| Customer website | vantanoir.store on Namecheap |

If yours differs, stop and show that screen. These values are already written in wrangler.jsonc and wrangler.deploy.jsonc. Never replace your existing database with an empty one merely to match a guide.

## Stage 2 — open the backend project on your iPad

1. Save both ZIP downloads to the Files app.
2. Open https://github.com/VNoir72/Vanta-noir-cloudflare-backend in Safari.
3. Tap **Code**, then **Codespaces**. Open an existing codespace or choose **Create codespace**. Wait for the editor to open.
4. In the editor, open **Terminal → New Terminal** using its menu. The terminal is the panel where commands are typed; it is not a source-code file.
5. Run `git status`. If it reports changes you have not saved, stop and send the output before replacing files.
6. Create a working branch:

```sh
git switch -c vanta-update-030
```

If it says the branch exists, use `git switch vanta-update-030` and inspect its status instead.

7. In Explorer (the file list on the left), use its Upload control/context menu to upload **Vanta-Noir-Integrated-Backend.zip** into the repository root. If Upload is not visible on iPad, send a screenshot so we can use the control your editor exposes.

**Checkpoint:** Explorer shows the ZIP, and `git branch --show-current` says `vanta-update-030`.

GitHub documents browser Codespaces under [creating a codespace](https://docs.github.com/en/codespaces/developing-in-a-codespace/creating-a-codespace-for-a-repository). Codespaces usage is subject to your account's allowance.

## Stage 3 — replace the old project on the working branch

These commands are for the repository terminal after Stage 2. They replace tracked project files on this branch; your previous committed main branch remains in Git history. Keep any uncommitted work separately first.

Run one command at a time:

```sh
mv Vanta-Noir-Integrated-Backend.zip /tmp/Vanta-Noir-Integrated-Backend.zip
```

```sh
git rm -r --ignore-unmatch .
```

```sh
unzip -o /tmp/Vanta-Noir-Integrated-Backend.zip -d .
```

The extracted package must have package.json and wrangler.deploy.jsonc at the repository root. Do not keep an old src/index.js or old migrations folder wired into this project; this release uses worker/index.ts and drizzle migrations.

```sh
node --version
```

Use Node 22.13 or newer. If necessary in Codespaces: `nvm install 22`, then `nvm use 22`.

```sh
npm ci
```

```sh
npm run build
```

**Checkpoint:** The build completes without an error. The supplied compiled files are convenient, but this rebuild checks the actual checkout.

Do not push to main or resume automatic deployment yet.

## Stage 4 — connect the terminal to your Cloudflare account

Run:

```sh
npx wrangler login
```

Open the displayed login link, sign in to the account containing your Worker and approve Wrangler. If the remote Codespaces callback cannot finish, stop and show the non-secret error; do not paste API tokens into chat or files.

```sh
npx wrangler whoami
```

**Checkpoint:** It identifies the correct Cloudflare account.

## Stage 5 — inspect and upgrade the existing database

First run the read-only check:

```sh
npm run db:upgrade
```

It should report `v0.1`, `integrated`, or `empty`. If it reports an unknown schema or an unexpectedly empty database, stop. Do not run random SQL from an older guide.

When the resource and schema check is correct, run:

```sh
npm run maintenance
```

This temporarily pauses the API while the database changes. Then:

```sh
npm run db:upgrade -- --apply
```

The script exports a SQL backup into backups/ before modifying tables and stops if backup fails. Download that backup privately from Explorer. Never commit it; it can contain customer details.

Earlier v0.1 tables are preserved as legacy_v01_* tables. Earlier products are copied as drafts, preserving stock. Their new price is 0 until reviewed because the old price unit was ambiguous; the original amount remains in the archive. Historical orders remain read-only under Orders → Earlier backend records. Old media stays in the R2 bucket, but migrated product pictures need review/reassignment. Review old promotions before recreating them.

The curated 682-product seed imports only once and starts with zero sellable stock. If the database was already integrated, existing seeded catalogue records are not overwritten by importing the seed again. Product content changes belong in admin.

**Checkpoint:** The terminal says the upgrade finished. If it fails, leave maintenance active and send the error. Do not deploy the old Worker against the upgraded schema.

## Stage 6 — protect admin and set its login details

In Cloudflare Zero Trust, open Access → Applications. Create or edit a self-hosted application covering:

- api.vantanoir.store/admin
- api.vantanoir.store/admin/*
- api.vantanoir.store/api/admin/*

Allow your owner email. Enable email one-time PIN or your selected identity provider. Do not protect the entire API domain: shoppers need the public catalogue, checkout and payment webhook.

In Workers & Pages → vanta-noir-api → Settings → Variables and Secrets, preserve valid existing values and set:

| Name | Value |
|---|---|
| ADMIN_EMAIL | Your owner email, exactly matching the Access policy |
| CF_ACCESS_TEAM_DOMAIN | Your actual https://YOUR-TEAM.cloudflareaccess.com origin |
| CF_ACCESS_AUD | Application Audience value copied from that Access application |

The package already supplies AUTH_PROVIDER, STOREFRONT_URL and ALLOWED_ORIGINS. It verifies signed login tokens. Do not substitute an unverified email header.

**Checkpoint:** Your Access application targets only the admin paths, and the owner email matches. If these screens are unfamiliar, send the application screen before continuing.

## Stage 7 — deploy the backend

In the repository terminal:

```sh
npm run deploy
```

This replaces maintenance mode with the new backend. Keep api.vantanoir.store attached to this Worker under Settings → Domains & Routes; do not point it at Namecheap. Keep existing root/www DNS and mail records.

Open these addresses:

1. https://api.vantanoir.store/health — should show `ok: true`, service `vanta-noir-api`, version `0.3.4`.
2. https://api.vantanoir.store/api/catalog — should show catalogue JSON, not an admin login page.
3. https://api.vantanoir.store/admin — should require owner login and then show the new dashboard.

**Checkpoint:** All three work. Zero sales is correct for a new database; dashboard figures are not the demonstration values from the mockup.

To save the source to GitHub, first use `git status` and check no backups, credentials or ZIPs are staged. The supplied ignore rules exclude those items.

```sh
git add .
```

```sh
git commit -m "Update Vanta Noir admin and storefront integration to 0.3.4"
```

```sh
git push -u origin vanta-update-030
```

Create and review a pull request to your production branch only after the checks pass. With automatic builds still paused, merge the reviewed source. Set the Cloudflare build command to `npm run build`, deploy command to `npm run deploy`, and root directory to the repository root. Ensure the build environment uses Node 22.13+. Then resume the intended production builds. Database upgrades are deliberately not hidden inside the deploy command.

See [Cloudflare build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) for the current build controls.

## Stage 8 — upload the Namecheap storefront

1. Sign in to Namecheap → Hosting List → Go to cPanel.
2. Open Domains and confirm the document root for vantanoir.store; normally it is public_html.
3. Open File Manager and that document root.
4. Back up the existing website files. Download the backup and keep it outside the public website folder.
5. Upload **VantaNoir-Discover-Namecheap.zip** into the document root.
6. Select that ZIP and choose **Extract** into the same document root, replacing the matching storefront files.
7. Confirm index.html, assets/, images/ and store-config.js are directly there, not inside a VantaNoir folder. The archive also includes the Apache routing configuration; preserve it during extraction.
8. Remove the uploaded ZIP from the public folder after successful extraction. Preserve unrelated mail, verification and SSL files.
9. Open https://vantanoir.store and refresh. If Cloudflare still serves the old version, purge the storefront cache in Cloudflare's caching controls.

The frontend already points to https://api.vantanoir.store. Do not paste API keys into store-config.js.

**Checkpoint:** Open a beanie or belt, change its colour and confirm it stays the same garment. In admin, publish a test product with real details and refresh the storefront to check the connection.

## Stage 9 — connect payment and order email

Keep accepting orders OFF until your prices, physical stock, delivery fees and policies are confirmed.

In Cloudflare Worker Variables and Secrets:

| Name | Type | What to enter |
|---|---|---|
| PAYSTACK_SECRET_KEY | Secret | Your Paystack test secret first |
| RESEND_API_KEY | Secret | Your Resend sending API key |
| EMAIL_FROM | Text | Verified sender, such as Vanta Noir <orders@vantanoir.store> |
| EMAIL_REPLY_TO | Text | An existing inbox you actually monitor |

In Paystack, configure the webhook as https://api.vantanoir.store/api/payments/webhook. The earlier /api/paystack/webhook URL remains supported. Do not replace a live payment key with a test key while customers are ordering.

For emails: add and verify your sending domain in Resend, using exactly the DNS records Resend supplies. Preserve existing mailbox DNS. Domain verification does not create a receiving mailbox. See [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction).

The backend processes queued emails after relevant API activity and on the configured five-minute schedule. Confirm that schedule appears in the Worker after deployment. Admin Settings → Customer email delivery shows the queue and lets you process pending messages. A sent status means provider acceptance, not guaranteed inbox arrival.

**Checkpoint:** Use your own email for a test order. Verify payment, one order record, one stock deduction, and one confirmation containing correct items, colours, sizes, totals and delivery address. Check the Resend log and the inbox/spam folder. Repeat callback/webhook notifications must not duplicate the receipt. Then check dispatch/tracking updates.

Only switch to live payment and enable real ordering after these tests and business settings are complete.

## Checks performed on these files

Release checks cover the compiled backend, owner authentication, denied anonymous access, catalogue/CORS, uploads, static page references, checkout reservations, payment duplication, colour-card identity and email queue/retries. External Paystack and Resend calls in automated tests are simulated; no real order, email, production database migration or hosting update was performed here.

Physical iPhone/iPad Safari testing and your real-account payment/email tests remain deployment checks. Measurement references are provisional, not measurements taken from your manufactured garments.

Product specifications update: product and quick-shop views now show an open Product details & specs section, plus sizing and care. Existing design features are used; missing features fall back to product name, collection and explicitly named fit. Fabric composition, GSM and care remain labelled awaiting confirmation when blank. Admin fields are editable and save through the existing product API. No manufacturer specifications were invented.

## Gallery, colour and department corrections

Combined product boards have been split into individual Front, Back and Side views. Quick Shop supports the same view switches. Reviewed matching designs are grouped as colour options, retaining each original inventory identity. The women’s mesh basketball jersey has five photographed design colourways. Women, Men and Unisex remain separate through search, categories, product navigation and filter resets. Fifteen source-construction discrepancies have corrected imagery and guarded metadata repairs. Existing merchant stock and custom measurements remain authoritative.

## Navigation and admin sizes — release 0.3.4

Colour filters now use consistent labels and cannot display a colour outside the selected filter. Product links and Back to the collection retain department, category, collection, search, colour, size, price, sort and saved filters. Help-page shopping links retain the selected department. Adding to the bag keeps it closed.

To add sizes: open Admin → Products → edit a product → Variations. Enter a size in **Add a size to every colour**, press **Add size**, and enter stock for each colour. Choose **Save product**. Labels such as XS, 3XL, EU 42 and 30/32 are supported; XXL and 2XL share one label. New sizes start at zero stock. For an orderable product, confirm its availability, price approval and stock as usual.

The new sizes also appear in **Size & fit charts**. Enter only actual measurements, leave unknown values blank, and save the product. Adding stock sizes does not invent garment measurements or approve provisional charts. These admin capabilities require the updated backend; upload both packages.
