# R12 deployment completed — 2026-10-28

Deployed application source: `b3923ae594bf984954fb72d1aaf641e1c69b6dad` on `work/size-charts-r11`.

## Production deployments

- Storefront `vanta-storefront`: version `a885c42c-35f3-4c33-93ce-523ba8975025`, deployment `8475dcc9-48c1-44e3-8714-e9effe5b9a8b`, 100% traffic. Published 2026-10-28T08:55:36.398286Z.
- Backend `vanta-noir-api`: version `3a79cd15-fd86-4394-b634-ad30df4f5a74`, deployment `a251f3b0-07f0-4f48-9394-700eaaec080a`, 100% traffic. Published 2026-10-28T22:15:23.64999Z.
- Both current deployments were verified through the Cloudflare API. Backend upload returned HTTP 200; 269 modules, checksum verified before publication. Existing secret bindings, assets and scheduled handler were retained.
- All 13 temporary backend upload pieces were removed after deployment.

## Validation

- Full release suite: 315 passed, 1 existing skipped (316 total). Typecheck passed.
- Compiled backend verification passed again on deployment day.
- Static verification: 698 pages and 27,948 local references.
- All 763 size guides and 3,724 studio mappings preserved by the release checks.
- Live homepage: corrected H1, 16 preview products, no broken images in the observed page.
- Live Socks page: revised fit/design-target copy, Coming soon, no purchasing action; gallery back-view selection loaded the correct labelled image.
- Live Motion Sleeveless Short Set: size dialog opened, top and shorts tabs worked, measurements and Brand sizing targets disclosure rendered.

## Commerce data

All 16 published products are previews and acceptingOrders is false. Four specifically identified published products had positive stock removed (21 variants, 93 units); backups and stock-adjustment records were retained. Draft inventory was not reset.

## Remaining limits

Physical sample measurements, sock shoe-size/stretch fit, wash tests, real payment and dispatch completion, authenticated admin visual/MFA checks, and visual inspection of every product photo remain unverified. Gallery database integrity and angle-label coverage do not certify the visual accuracy of every image.

See `docs/audit-fixes-r12-2026-10-27.md` for implementation details. This completion record is documentation only; it does not change the deployed application build.
