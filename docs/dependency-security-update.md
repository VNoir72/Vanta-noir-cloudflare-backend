# Dependency security update — 1 October 2026

Prepared from `vanta-update-30` at `cc297c69fc69779c1a51822a12245db470225b4c`, after the admin save/close update was merged.

## Changes

| Package | Previous | Updated |
| --- | --- | --- |
| next | 16.3.5 | 16.3.8 |
| @cloudflare/vite-plugin | 1.57.0 | 1.62.4 |
| wrangler | 4.136.0 | 4.146.0 |
| miniflare | 5.20260921.0-alpha | 5.20261001.0-alpha |
| undici (transitive) | 7.29.0 | 7.29.1 |
| workerd (transitive) | 1.20260921.1 | 1.20261001.1 |

The Cloudflare versions match the Vite plugin's declared dependencies and peer requirements. Miniflare remains on the project's existing v5 prerelease line; the existing v4-option adapter passes the tests with this update.

Removed unused development dependency `drizzle-kit` and its obsolete esbuild loader chain. There are no repository scripts, configuration files, or imports using drizzle-kit. The application still uses `drizzle-orm` 0.45.2. Existing SQL migrations and Wrangler-based database commands remain unchanged. Future schema generation with drizzle-kit would require deliberately installing and reviewing that tool again.

Regenerated `package-lock.json` and adjusted script allow-list entries for removed tools and the new workerd version. No forced audit fix, dependency overrides, database tooling downgrade, application code edits, database migration, or production setting change was used.

## Security result

The original lockfile produced 9 npm audit findings: 1 critical, 1 high, and 7 moderate. The updated lockfile produced **0 known vulnerabilities** across production and development dependencies on 1 October 2026. This is a point-in-time dependency audit, not a guarantee that the application has no security defects.

- Next.js advisory: https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j (patched from 16.3.6). The repository did not use the affected `next/og` ImageResponse feature; the package is patched regardless.
- Undici advisory example: https://github.com/advisories/GHSA-w293-vg96-wgc3 (patched from 7.29.1).
- Removed esbuild advisory: https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99.

## Verification

- Clean `npm ci` installation succeeded.
- `npm audit --json`: 0 findings.
- `npm run typecheck`: passed.
- `npm test`: all 59 tests passed.
- `npm run build` and `npm run verify:release`: passed, including the compiled Worker, isolated D1/R2, private admin authorization, JWT rendering, catalogue, CORS and media upload/read checks.
- `npm run build:storefront` and `npm run verify:storefront`: passed for 697 pages, 20,935 local links/assets and 682 product pages.
- Wrangler deployment dry run passed with `wrangler.deploy.jsonc`; no deployment was performed.
- All 699 HTML/asset files in the previously prepared Sold-Out Storefront Update package are byte-identical to this build. That ZIP remains usable for the earlier storefront change.

## Deployment

Merge this change into `vanta-update-30`, then update the existing Codespace checkout. If Git reports local changes, preserve and resolve them before continuing.

```sh
git fetch origin &&
git switch vanta-update-30 &&
git pull --ff-only origin vanta-update-30 &&
npm ci &&
npm audit &&
npm run typecheck &&
npm test &&
npm run build &&
npm run verify:release &&
npm run deploy
```

The commands stop if a step fails. This deploys the Cloudflare backend/admin, including the previously merged save/close fix. No database migration or catalogue import is needed. The earlier sold-out storefront change still needs its separate Namecheap upload if it has not been uploaded yet. This dependency patch does not require a replacement storefront ZIP.

After deployment, reload the admin and verify an intended product edit saves, closes the editor, and remains saved when reopened. Local verification does not confirm a production deployment.
