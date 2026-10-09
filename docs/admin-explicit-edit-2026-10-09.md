# Admin editing continuation — 9 October 2026

Based on `codex/dual-shipping-rates` at `e1b9502171c1bb30b4f38046e6d14c18aee73c47` (PR #82). This is an incremental draft, not a production deployment or completion of the full admin audit.

Implemented:
- Pickup details start collapsed, open with Edit, and close only after a successful save. Save-and-exit uses the same validated request; failures preserve the draft.
- Store settings, bulk prices, stock adjustments and promotions require explicit editing and return to a non-editing state after success.
- Dashboard artwork has a separate disclosure and an explicit save; selection alone does not persist. Insights, artwork and the detailed reports control stack at full width.
- Launch-review and operations pagination appear before long record lists.
- Alert dialogs and nested portal fields receive the pearl palette. The base admin colour scheme is light.
- The unsaved-change provider now updates when a registered editor's busy/dirty state changes. A reproduced failed-save case previously left Save and continue disabled; the interaction regression covers retry and successful navigation.

Validation:
- `npm run typecheck`
- `npm run build`
- `npm run verify:release` (compiled Worker, isolated D1/R2, auth and dashboard checks)
- `node tests/browser/admin-editing-dom.cjs` (real React components in JSDOM: pickup collapse, no autosave, failed-save retention/retry, save-and-exit persistence, settings locking, price locking)
- Browser tests were added in `tests/browser/admin-editing.cjs`; browser launch is blocked in this execution environment by a socket permission error. JSDOM does not validate layout or rotation.

Still required before claiming the whole request complete:
- Run both browser suites and inspect phone/tablet/desktop portrait and landscape; verify delayed navigation and all portal states retain the glass design.
- Complete the explicit-edit and save-on-exit sweep for order/return/exchange, reward, parcel-profile and remaining specialist editors. Do not replace multi-step business actions with a generic save that silently performs only part of the operation.
- Verify authenticated production and deploy a reviewed release. No production settings, orders, stock, courier bookings or data were changed in this continuation.
- Shipping activation still requires real measured parcel profiles, the saved pickup address, frontend upload and provider readiness as documented in shipping-rollout.md. This continuation does not turn on Shipbubble or Terminal.
