# Preorder setup and compact admin layout

Products now has an explicit **Add preorder** action. The editor starts in preorder mode with no physical-stock claim. The owner supplies garment images, a price, confirmed sizes/colours, dispatch timing and the capacity they can fulfil. The optional `orderMode` JSON field preserves the intended mode while a new product remains an unlaunched draft or preview. Existing products without that field retain their previous availability behaviour.

Saving a draft does not publish or launch it. The existing owner-only certification and launch checks remain; preorder launch requires a dispatch promise. Launch records the selected mode without manufacturing inventory or increasing capacity. Checkout continues to reserve and consume the bounded per-variant quantity through the existing atomic inventory controls.

Preorder quantities are labelled as capacity in the editor, catalogue and inventory tools. Inventory excludes preorder capacity from physical On hand totals, while Reserved and Available to order include that capacity. Capacity changes receive a preorder-specific audit reason. No live garment, stock quantity, publication or order was changed during implementation.

More insights previously inherited `grid-area: attention` from the retired dashboard grid. This created an implicit column and row: the two cards had tops at 903px and 1383px, leaving a large gap. The insight panel now has its own wrapper, resets grid placement and aligns both cards at the top. High-specificity density overrides make summary cards and charts compact without changing browser zoom, branding or data.

Checks: full suite 307 tests, 306 passed, one existing skip, zero failures; TypeScript and production build pass. Isolated fixtures cover preorder intent persistence, hidden drafts, dispatch requirements, owner certification, unchanged capacity on launch and physical-stock totals.

MFA status: independent enrollment enabled for authenticator apps, biometrics and security keys, with a 24-hour MFA session configuration. Owner approval was received and the change was verified without changes to existing admin policies or global enforcement. Device registration and admin-specific enforcement remain separate steps.

The backend release preserves existing bindings, secrets, runtime settings, scheduled handling and binary assets. Generated JS/CSS ships with its matching Worker version through `prepare-connector-backend.mjs`; no separate asset-upload credential is needed. Previous backend version for rollback: `d79fe24a-b0c7-4d03-a3ae-65b65cf98a4e`.
