# Build 32 navigation performance update

The shop eagerly mounted every matching product and image (763 products in the public catalogue), and the refresh effect downloaded the catalogue at startup and again on every Shop/Saved/Bag tab change. The JSON response body also outlived the network timeout.

Changes: virtualized product rows with a small initial render and bounded render window, memoized filtering, a single in-flight catalogue request shared by startup/pull-to-refresh/background polling, no catalogue request on tab taps, account restoration independent of catalogue download, and a deadline covering headers plus JSON body (even if native abort is ignored). The featured garment WebView is memoized to avoid repeating its image processing on unrelated state changes. Existing layout, native configuration, dependencies, and update restart behavior are preserved.

Validation: TypeScript and lint passed on both sources. Build-32 suite: 48 passed, including stalled-body/ignored-abort regressions. Native fingerprint verified as 9829b16b33975c503904e03aebd352fa673a78ca. EAS workflow rechecks fingerprint, types, lint, tests and export before publishing to Android production. On-device timing and update adoption cannot be measured from this environment and remain to be confirmed on the installed phone.

Previous production update: 01a1714a-6846-7d24-986f-ddcc8bf97b21 (source 3c17477). Production OTA published successfully: group fae3be51-72b9-487b-b6c9-33afb34e8965, source d5a820fbfe7971968431f0239ca914c75f8ca3ed, workflow 01a19427-e174-78d4-bf87-42fd931d7761.
