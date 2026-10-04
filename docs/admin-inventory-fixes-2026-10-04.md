# Admin stock and navigation corrections — 4 October 2026

The inventory editor previously mixed typed values with saved quantities, kept Save active after success, and gave only temporary confirmation. Orders pagination also rendered outside Orders, while status controls used inconsistent save behaviour.

## Changes

- Available Stock shows saved on-hand, reserved and available quantities, with Available, Low (1–3), Sold out, Archived/inactive and All filters. Totals exclude unpublished/inactive variations. Product totals and individual colour/size rows are available.
- Stock drafts are separate from recorded values. Empty, fractional, negative or excessive input cannot be saved. Each in-flight row is locked, successful saves show a persistent quantity/time confirmation, and failures retain the entry with an inline error. Save changed rows handles multiple edits and preserves failed rows.
- Inventory writes retain the existing expected-stock and reservation guards. The response returns the recorded row; stock updates synchronise the product editor. The quantity means the new total on hand, not an amount to add.
- Dirty-state navigation offers Stay, Discard and, for supported forms, Save and continue. Product, settings, inventory and operation forms are protected; reload/closing uses the browser's unsaved-work warning. Saving one operations form does not mark other forms saved.
- Product and settings switch labels explain the save requirement. The store's open/closed heading uses persisted settings, not unsaved switch positions.
- Order pagination only renders under Orders. Order status changes require Update status, matching Operations. Stock refreshes after stock-affecting operations.
- Stock history displays and searches product name, colour, size, SKU and adjustment reason.
- Main inventory and product editor consistently accept only whole quantities from zero to 100,000. No database migration or stock reset is required.

## Validation

- TypeScript check passed.
- 84 tests passed in the suite excluding the unrelated Namecheap PHP gateway test (that process stalled in this environment). This update does not modify Namecheap code.
- React DOM interaction checks passed for blank-input handling, persistent saved feedback, unchanged saved totals during editing, locked pending rows, retained failed entries, stay/discard navigation, and explicit order updates.
- Settings interaction checks cover pending switches, persisted launch-state heading, preserved edits on navigation, and clearing dirty state after save.
- Backend build and isolated compiled-Worker release checks passed, including authenticated stock save/readback, stale-write conflict, invalid input, and history search by product name. Test writes use a temporary local database only.

## Deployment

Deploy the backend and its matching client assets to the existing vanta-noir-api Worker. Preserve bindings, secrets, schedules, domain routes and access controls. No Namecheap upload is required. Production inventory and store settings are not modified by this deployment.
