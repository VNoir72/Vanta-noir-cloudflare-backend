# Editable free shipping and gifts

Use **Store admin → Discounts → Free shipping & gifts** (also available in **Operations → Promotions**).

Each offer has separate editable amounts in naira for free shipping and one free gift. Enter the same amount in both fields to unlock them together. The form initially suggests ₦300,000; it is editable and does not create or activate an offer by itself. Enter 0 for no spending minimum. Nigeria includes every state and the FCT; delivery must already have a configured rate/zone. International destinations still use the owner's published shipping rates unless explicitly included in an enabled free-shipping campaign. No proposed international prices were installed.

Eligibility uses the current selling-price subtotal **before discount codes**, excluding delivery and gift value. For example, a ₦300,000 bag with a ₦30,000 discount still meets a ₦300,000 reward threshold if “Allow this reward with a discount code” is enabled. That checkbox is off by default. Gifts themselves never increase the subtotal or discount entitlement.

## Owner controls

- Offer name, enable/pause switch, dates, eligible countries, usage limit and priority.
- Independent free-shipping and gift thresholds. Either benefit can be disabled.
- One specific published gift variant: product, colour and size. It must have an approved price; gift availability uses actual stock. The gift is added at zero cost and cannot be substituted silently.
- Automatic offers or a private code, optionally restricted to the checkout email. A newly selected private-code offer defaults to one use. Generated codes are random; keep them private. The checkout email restriction is a contact-detail match, not proof of email ownership.
- Lucky recipients: choose a saved template, supply up to 500 eligible emails and draw up to 25 unique winners. Each gets a separate paused, single-use code. Review/enable each winner's campaign and share the code yourself. Retrying the same draw does not create another set. No messages are sent by the draw.
- New campaigns and winner codes start paused. No offers are seeded by this release. The owner chooses the actual gift and activation dates.

One reward campaign applies per order; eligible campaigns with higher priority are considered first. A private code explicitly selects that campaign. It does not stack with another reward campaign. Set both benefits in one campaign for a combined offer. The separate discount-code feature can stack only when the reward permits it.

## Customer and order behavior

The bag and checkout show the extra spend needed for shipping, a gift, or both. Bag estimates are for Nigeria and the destination is confirmed at checkout. Checkout shows the gift at zero cost and the final shipping fee before payment. A separate reward-code field supports selected customers.

The server rechecks prices, destination, dates, stacking, recipient/code, campaign version, remaining uses and stock. Pending checkouts hold stock and reward capacity for 15 minutes. Failed initialization releases both; paid orders consume the use. Concurrent buyers cannot reserve the last gift or a final code use twice. Changed gifts/offers require the customer to refresh before payment. Unavailable delivery remains unavailable even when a free-shipping threshold is met.

Paid and gifted quantities of the same variant are reserved and deducted together. Gift units appear in fulfilment, receipts and emails but are excluded from bestseller units and sales-report unit counts. Returns value a gift at zero; received paid/gift units can be exchanged together. Late payments with unavailable stock or an already-consumed limited reward enter `paid_stock_review` for the owner to resolve before fulfilment. Changing an offer does not retroactively rewrite existing orders.

## Install after merging into vanta-update-30

Keep using the existing Codespace. Preserve any uncommitted work; do not reset it. With a clean checkout of `vanta-update-30`, pull the merge and run:

```sh
git pull --ff-only origin vanta-update-30
npm ci
npm run typecheck
npm test
npm run build
npm run verify:release
npm run db:rewards
```

The last command is a read-only database check. If it reports that the integrated store is ready, install the additive rewards tables and order-item gift flag, then deploy:

```sh
npm run db:rewards -- --apply
npm run deploy
```

`db:rewards -- --apply` first exports a private database backup under `backups/`, applies only `0008_editable_rewards.sql`, and registers that migration. Keep the backup privately. It does not replay older migrations, import the catalogue, reset stock, change rates or activate offers. A repeat run reports that the schema is already installed. An unexpected or partial schema stops installation for review. Do not use `db:upgrade` or the catalogue-import command for this update.

After the Cloudflare deployment succeeds, upload **Vanta-Noir-Editable-Rewards-Storefront-Update.zip** into Namecheap `public_html`, extract there and replace matching files. It includes 697 HTML pages, their matching JavaScript/CSS and the existing payment marks/credits. Existing product images, `store-config.js` and hosting configuration are not included. Back up the matching existing files before replacing them. Keep old hashed assets during the update for visitors with an older open page.

Deploy the backend first: the new checkout depends on `/api/rewards/quote`. Merging the PR alone does not publish the website.

## Review after deployment

1. Open Discounts and create a paused campaign; change both amounts, save and reopen it to verify persistence.
2. Choose the real gift and countries. Enable only when the offer is ready to go live.
3. Check bags below, at and above each threshold. Confirm the subtotal rule with a discount, with stacking enabled and disabled.
4. Confirm a Nigerian address and an enabled international address receive the correct fee. Check private codes with the intended contact email.
5. Review a test order's gift, delivery, receipt and inventory. Use Paystack test mode in a separate test environment; this release did not submit a production payment.

## Verification

TypeScript passed. All 69 tests passed. Compiled Worker verification passed, and the storefront checks verified 697 pages and 25,117 local links/assets. The dedicated database installer was exercised against an isolated local D1 database: read-only preflight, backup and migration, then a repeat run that made no changes. Test coverage includes gift/code races, late payment review, pre-discount boundaries, changed-offer rejection, discounted totals, same-variant allocation/exchanges, private-code eligibility, owner permissions and idempotent paused winner draws. No production database writes or deployment are performed during preparation.

A browser screenshot/interaction pass was not available in this execution environment. Review the final form layout on your iPad after deployment.
