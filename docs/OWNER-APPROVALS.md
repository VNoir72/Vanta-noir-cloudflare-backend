# Owner approval workflow

Staff changes are proposals until the owner approves them in **Store admin → Staff approvals → Review change → Approve and apply**. Reject leaves live records unchanged. Staff can check **My requests**. The notification bell includes pending approvals.

The server queues stock, bulk prices/imports, product creation/editing/visibility, order fulfilment, tracking, returns, replacement allocations/tracking, and catalogue images. Existing role restrictions remain enforced both when submitting and when approving. Staff cannot change refunds, roles, settings or payment status. Image submissions remain in private R2 staging until approved; the approved URL appears in the request result. No staff invitations or sign-in-policy changes are made by this release.

Requests retain the submitter, role, proposed values, original affected records, reviewer, decision and result. Concurrent identical submissions reuse a pending request. A conditional claim prevents a request being applied twice. Changed records require a fresh request. Disabled staff or changed roles cannot have old proposals approved. Partial batches or application errors are marked **Needs review**. An interrupted **Applying** request is never retried automatically: check its live records and audit entries first.

Owner edits continue to apply directly. Verified Paystack notifications and courier/system events are system updates, not staff proposals.

# Payments

Signed Paystack `charge.success` webhooks and receipt verification mark matching successful transactions paid automatically. The existing five-minute scheduled Worker now also verifies at most ten pending transactions from the previous seven days per run, with a four-minute concurrency cooldown. Verification makes GET requests only and never initiates a charge. Reference, NGN currency and amount must match. Failed/provider-unavailable checks leave the order pending. Repeated confirmations do not allocate inventory twice. A verified payment without sufficient stock remains paid with a fulfilment status of `paid_stock_review`.

The owner order list refreshes every 30 seconds while visible and with no unsaved drafts. Older orders remain eligible for signed webhooks and explicit receipt verification; they are not scanned indefinitely.

# Deployment

Apply `drizzle/0010_staff_approvals.sql` before deploying the Worker, then `drizzle/0011_catalogue_wording.sql`. The latter changes only catalogue text; IDs, slugs, audiences, prices, stock, garment artwork and image URLs are preserved. The approved Stealth name is `STEALTH SET`. Batch/Femme labels are cleaned in collection metadata, API output and future product input.

The Cloudflare Access sign-in allowlist is separate from the staff role table. The earlier request to allow the specific staff account was blocked by automatic approval review and still requires explicit owner authorization; this release does not change that policy.

# Validation

- TypeScript typecheck and 91 tests passed (the unchanged Namecheap gateway test excluded).
- Dedicated isolated D1/R2/JWT tests cover concurrent submissions/reviews, stale records, rejection, staff isolation and revocation, products/imports, private images, order/tracking/returns, signed webhooks and reconciliation.
- The compiled Worker is exercised in an isolated runtime before release.
- Chromium layout checks cover 1440, 1024 and 390 pixels; owner review controls are exercised with fixture data.

## Import fingerprint correction

Post-deployment comparison detected that applying display normalization inside the historical importer changed its fingerprint and reinserted old gallery rows. Those exact timestamped import rows were removed after backup; all 682 published product galleries and colourway images match the pre-release baseline again. The importer now explicitly parses source metadata without display normalization, preserving the legacy fingerprint. A regression test checks that fingerprint and verifies that reading cleaned collection labels cannot resurrect a removed source gallery.
