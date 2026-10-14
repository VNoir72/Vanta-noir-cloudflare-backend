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
