# R13 production completion — 28 October 2026

Application source: `bf97d07627ca1c69a23eafdd124045d2d0d6e8b9`.

- Storefront version `ebc5447b-3579-4764-85ed-62acd7c90e4e`, deployment `e5fea724-052f-4bb2-b277-b6a1f83cc0a9`, 100% traffic.
- Backend version `71cd2626-e0c6-4e7d-9494-d9f0fd0b9150`, deployment `56ddec9b-ab73-42ae-92c0-dec919ad9296`, 100% traffic.
- Both uploads returned HTTP 200 and matched their local artifact SHA-256. Existing assets, secret bindings and scheduled handling were retained.
- All 763 products are published with preview availability, preorder order mode and approved manufacturing size guides. Checkout remains closed.
- Live search caught three Presence Studio sets without any variant rows. Added S/M/L/XL/XXL, zero stock, active variants for their exact saved image colourways: Noir Circuit `VNPS-01-*`, Sculpt `VNPS-02-*`, Nightline `VNPS-03-*`. No manufacturing capacity was invented.
- Total variants: 4,757. Existing stock total remains 12,989, unchanged. No duplicate SKUs, products without active variants, or variants without a matching image colour were found after repair.
- 18 temporary upload fragments were removed after successful deployment.

The admin and storefront release checks passed. Full catalogue schema/pack validation covered all 763 records; 14,440 existing numerical chart values were preserved. Affected test suites passed after updating the expected extra tech-pack identification sheet and release heading.

See `catalogue-r13-2026-10-28.md` for scope and remaining production inputs. The 28 missing selling prices, actual preorder capacities, dispatch commitments and absent original decorative artwork are not represented as completed or verified.
