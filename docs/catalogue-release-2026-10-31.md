# Published catalogue and app update — 31 October 2026

All 21 model-free garment image sets are live. Fold uses owner-selected B: tonal ivory embroidery on wearer-left chest, plain cuffs. Four separate front/back/left/right images and the two existing detail views are mapped correctly. Production R2 bytes were checked by size and MD5; D1 mappings were read back. The public Fold product page loaded the selected front and right images and displayed the four view controls plus two details.

This release stores production images in Cloudflare R2. Git tracks the guarded publication SQL, rollback SQL, URL mappings, generation provenance, file sizes and checksums. The `outputFile` fields describe local processing paths; `outputUrl` is the published asset. Re-uploading duplicate image bytes to GitHub is not required for serving or restoring the release. Unselected Fold A and superseded draft artwork are excluded from this release branch.

The Android performance fix is published to production for installed build 32: update fae3be51-72b9-487b-b6c9-33afb34e8965, commit d5a820fbfe7971968431f0239ca914c75f8ca3ed, runtime 9829b16b33975c503904e03aebd352fa673a78ca. EAS workflow 01a19427-e174-78d4-bf87-42fd931d7761 succeeded. All 48 build-32 tests, lint, typecheck and Android export passed. On-device speed and update adoption remain unmeasured.

The completed 21/21 count applies to the model-free image scope. Physical samples and manufacturing-master validation remain separate work. Orders remain disabled; no payment or order was created.
