#!/bin/bash
set -eu
mkdir -p /scratch/home /scratch/tmp /scratch/project
cp /deps/advisories.json /scratch/advisories.json
cp -a /source/. /scratch/project/
cp -a /deps/node_modules /scratch/project/node_modules
cd /scratch/project
mkdir -p work
exec > /scratch/check.log 2>&1
echo 'Isolation: network disabled; read-only source/root; no capabilities; bounded resources; dummy services.'
node scripts/ci/advisories.mjs
php -l portable/storefront-gateway.php
npm run typecheck
node --test --test-concurrency=1 tests/*.test.mjs
npm run build:storefront
npm run verify:storefront
echo 'Browser suite: storefront-refresh'
timeout 180 node tests/browser/storefront-refresh.cjs
timeout 180 node tests/browser/campaign-carousel.cjs
timeout 180 node tests/browser/launch-journeys.cjs
timeout 180 node tests/browser/storefront-reveal.cjs
timeout 180 node tests/browser/store-policy.cjs
timeout 180 node tests/browser/tech-packs.cjs
npm run build
npm run verify:release
python3 tests/namecheap-archive.test.py
for suite in launch-review storefront-performance portal-audit customer-care staff-chat sales-desk admin-navigation site-pages; do
  echo "Browser suite: $suite"
  timeout 180 node "tests/browser/$suite.cjs"
done
python3 scripts/package-namecheap.py outputs/namecheap outputs/vanta-noir-namecheap-update.zip --repair-code
echo 'PASS: isolated release checks completed'

