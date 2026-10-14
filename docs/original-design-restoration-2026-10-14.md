# Original design restoration — 14 October 2026 UTC

The owner rejected the mockup rebuild and requested the original storefront and admin, with organization improvements only. This supersedes the visual direction in mockup-rebuild-2026-10-14.md.

## Immediate restoration

- Admin: pre-redesign version e4b52446-ffc7-4732-ad92-9b9af162837e, deployment 6fe49fac-e3ed-4dc3-a589-64dd6fe3217b.
- Storefront: pre-redesign version 089033b8-cbfb-4bbc-838c-74961f7d590b, deployment 53fce191-a80a-4bba-be0f-e176edad9953.
- Both restored at 100% traffic. No database reset, settings reset, inventory adjustment, payment, booking or notification action.

## Source changes

Original emblem, floating glass header, inline search, header links, hero text/art/ribbon geometry, product cards, filter dialog and product details are restored from the pre-redesign source. The admin again has its full original sidebar, original glass palette/background, product workspace, order workspace, app controls, membership controls, settings and original chart/card arrangement. Mockup-only reference styles and settings-tile wrapper were removed.

Organization changes are limited to a shorter launch-review summary, wrapping action/report/status rows, aligned and collapsible settings sections, minimum-width/overflow handling, and restrained tablet header spacing. They do not replace navigation or remove tools.

The previously requested four overview metrics remain: orders to prepare, sales, low stock and purchase conversion, presented in the original card layout. Owner accent controls and light/dark/device/time themes remain. Short identifier presentation and short new-SKU suggestions remain; real identifiers are unchanged. Existing account, security, CRM, automation, payment, shipping, stock, approval and native mobile code changes outside the redesign are retained.

## Verification

TypeScript passed. Fifteen focused theme, accent, compact-reference, original header/search/bag and hero checks passed. The original live design was visually verified immediately after rollback. Full production builds are run against source 2ba49cfd1e1ce99c93a48f81a3eddf6a050eb73f before activating the organization cleanup.

Physical mobile/iPad rotation tests are not claimed. Native Android builds were not started. No customer or store records were changed in browser checks.

## Published organization release

Source 2ba49cfd1e1ce99c93a48f81a3eddf6a050eb73f passed both full Cloudflare production pipelines.

- Admin build 854ea9fb-d3c9-43ec-bac2-e136c18e2efb, version 81c21153-3257-4233-8bc1-91981bff19e0, deployment a1e2f29d-17dd-46c1-b912-02b44b7d58a2.
- Storefront build eda2630f-4250-49fb-b916-6af6837b5573, version 1c30e7b5-57e8-4169-b157-0991b766b68b, deployment 3d2f191f-e4e5-4fe5-964c-f7333fe60b42.
- Both served at 100%. Live desktop screenshots confirmed the original design, restored emblem/hero/header, original full navigation and glass workspace, and reduced launch-summary spacing. Inline search and bag open/close were exercised without adding products or placing orders.

Final admin follow-up source 9c99f013e8e91215e95059cb957570719559ddbe groups the verbose connection reports into an expandable section above the original settings and aligns overview detail links. All connection controls remain mounted and accessible.

Final admin build e8c5e9b3-b1e5-48ea-891c-a1e185fdf8f1 passed. Version 33d3a804-c842-4695-887e-8ba495141569, deployment 0e618743-86b7-4c63-8b6d-6ed18538d8d9 at 100% traffic.
