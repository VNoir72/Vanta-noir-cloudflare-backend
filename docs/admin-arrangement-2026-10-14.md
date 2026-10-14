# Admin arrangement and short customer references

User scope: use the five attached arrangement references without replacing current themes, storefront hero, glass materials or navigation.

- Products: catalogue table, images, price, stock, truthful purchase visibility, edit and secondary actions; workspace tabs and collection filter. Release/quality tools retained in a disclosure.
- Orders: status tabs and search, list/detail layout, customer link, original fulfilment, parcel, courier and tracking editors. CRM table/profile layout.
- Settings: category navigation and focused original editors; all six allowlisted settings groups retained. Delivery, payments, connections and staff remain reachable.
- App controls: expandable sections and owner brand presets. Five presets: dark burgundy, gold, pearl/lime, tech green, blue. Separate admin accent; website/app share storefront accent. No saved accent or theme changed automatically.
- Mobile: account rows aligned to website categories; app benefits remain separate; shared accent refreshes on opening/foreground, contrast-aware button labels.
- New checkout references: VN- plus ten unambiguous alphanumeric characters. Unique database constraint remains authoritative. Checkout attempts retain idempotency and old attempts retain their original references.
- Legacy 32-hex order references: deterministic short customer alias, accepted by guest lookup with email/phone verification and by admin order search. Canonical payment keys remain unchanged. Collision ambiguity fails closed.
- Courier identifiers remain complete and unchanged.
- Existing SKUs: user-authorized one-time script `scripts/shorten-catalog-skus.sql` applied to 4,467 long values. Before and after: 4,617 variants, 102 stock units, 4,617 active. After: 4,617 unique SKUs, max 11 characters. Recovery mappings stored in store_meta with prefix sku-shortening-20261014:. Only SKU column changed.

Validation: full suite 264 pass, 1 existing skip; focused legacy alias lookup test includes wrong-identity rejection and unchanged courier tracking. Mobile typecheck and lint pass. Production build gates and live visual checks recorded after release.

Native changes require the installed app to receive a compatible app release; publishing web workers alone does not update an installed Android binary.

## Release record

- Admin/API source: `59686e5ba6ad25afc9043902bbc897157ee111dc`. Build `4eb1c2e3-4aa5-4f6d-b6bf-24eb7c3f219b` succeeded with full typecheck, mobile lint/typecheck, regression, build and release gates. Version `910acd3a-2682-4a7d-b385-3d819d93e7c0`, deployment `b84e9c68-0b7a-46bc-81d7-5db91e33fac3`, 100%.
- Storefront source: `d43676f1b6708e4545e3de3fec14bb2d85b61469`. Version `6d3bdd86-52a8-4efb-a66e-c7b43c180177`, deployment `fa6bf563-cc49-4fa0-b614-6782c62fb0b4`, 100%. Original hero, navbar, pearl/lime glass appearance verified live.
- Live checks: products table and actual compact SKUs; settings categories; order list/detail and short aliases; five accent choices with original pearl/lime selections unchanged. Final overview uses actual short aliases. No customer order, payment, shipment or brand-setting mutations during UI verification.
- Final refinements: membership precedes other app controls; shipping editors collapse within order details; duplicate catalogue heading/actions removed; compact SKU generation retained for new variants.
- Regression gate exposed a body-read timeout race. Fixed explicit timeout state without weakening the gate; all twelve focused security checks and final full release pipeline passed.
- Native publication remains blocked: automatic approval review rejected opening Expo release controls, citing native Android releases as separate scope. No native release or build was performed and no alternate access path was attempted. Native source edits are committed and checked; explicit approval for separate native publication is still required.
