# Staff sales desk

The approved walk-in sale workflow shares inventory with online checkout. Open **More tools → Sales desk** as owner. In **Staff access**, assign the new **sales** role to staff who should record in-store sales. Existing staff roles are unchanged. Sales staff see the sales desk and their own requests.

Choose a published garment variation, quantity and received payment method. Transfer/card entries require a reference. Optional customer name/phone is private. Search accepts product names or SKUs, including a keyboard-style scanner entering a SKU. Prices come from the server; there is no staff discount or refund override.

Submission atomically creates a pending sale and reserves all selected units using the existing checkout reservation table. Online availability falls immediately while on-hand stock remains unchanged. **Staff approvals** finalizes the sale: approval deducts stock once and includes the delivered sale in sales reports; rejection releases reservations. These entries do not call Paystack, send online shipping emails or book deliveries. Walk-in receipts use a distinct `VN-WALK-` reference. The sale history retains staff, quantities, variants, totals, payment reference and decision.

Duplicate submissions reuse a per-sale key. Network retries retain that key and lock the draft. Concurrent requests recheck all stock and server prices inside the D1 batch. Owner review commits the decision, stock ledger and reservation release together. Removed staff lose access immediately and their pending sale reservations are released; disabled/reassigned staff cannot have old sales approved, but the owner can reject them to release stock.

Before deploying, apply only additive migration `drizzle/0012_walk_in_sales.sql` to the existing D1 database. It creates the sales metadata table and does not alter stock, catalogue, staff, settings or prior orders. Do not run catalogue import or unrelated historical migrations. Build/deploy the existing Worker with preserved bindings and secrets. No storefront redesign or Namecheap replacement is needed for this admin feature.

Validation: `tests/walk-in-sales.test.mjs` covers authorization, shared checkout availability, atomic last-unit contention, retries, prices, invalid input, approval/rejection, role revocation and deletion. Existing staff approval integration tests cover the other write boundaries. `tests/browser/sales-desk.cjs` covers desktop/mobile entry, totals, required references and interrupted submission retries with isolated fixtures.
