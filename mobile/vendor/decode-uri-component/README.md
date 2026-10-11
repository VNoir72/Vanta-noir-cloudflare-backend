# URI decoder security backport

Source: decode-uri-component 0.5.0 from the official npm registry (MIT license retained).
Advisory: https://github.com/advisories/GHSA-vcc3-ghjq-m6fr

Expo Router 57 uses query-string 7, which requires a CommonJS function. The patched upstream package is ESM-only; replacing it directly breaks that API. This copy changes only the export to CommonJS. The postinstall script verifies the exact original source hash before replacing the decoder; unexpected dependency changes fail the build. Remove the backport when Expo Router adopts the fixed decoder natively.
