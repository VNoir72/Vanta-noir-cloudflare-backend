# Storefront and staff portal audit — 7 October 2026

Approved scope: mobile logo/search/saved/bag only; informational links in the footer; announcement above the hero; contact details only on Contact; uncropped hero with owner media/height controls; full staff communication workspace; consistent pearl/lime across all staff roles.

## Changes and findings

- Removed mobile top page links and duplicate bottom shopping navigation. Added Saved to the header. Header hides on downward scroll and returns with readable pearl styling on upward scroll; keyboard focus and open search keep it accessible.
- Moved the owner-controlled announcement to the hero's upper edge. Stationary, left/right motion, scheduling and reduced-motion support remain. No announcement in the bag.
- Removed phone/email from global footer and policy contact blocks. The Contact page alone displays the configured support details beside the existing support enquiry workflow. This is display routing, not a claim that public contact settings are secret.
- Added default full-image fitting for the existing campaign photo/video, preserving both models. Owner can choose Fill (cropping), independent mobile/desktop heights, mobile artwork and a playlist of approved images or muted videos. Narrow screens necessarily have dark space around landscape media; original artwork is unchanged.
- Replaced compact Team chat window with a full staff portal: persistent channel sidebar, channel feed, composer, per-channel drafts, unread indicator, Sales/Support/Admin searchable guides, and permission-limited order/delivery lookup and read-only enquiry details. Hero-to-emblem intro retained. Six-second open polling remains; this is not a WebSocket presence service.
- Order lookup is shown only to Owner and Support, matching the existing order-context API permissions. Other staff retain their own workspace permissions and all can use team channels. Business mutations still require the existing owner approval flow.
- Corrected inherited dark operation panels, staff forms, owner mobile brand, chart/menu controls, account/approval/email surfaces and portalled controls. Shared semantic tokens preserve distinct error/destructive, warning and success states.

## Verification

- TypeScript typecheck and full suite: 114 passed, 1 environment-dependent skip, no failures.
- Compiled Worker validation: auth, revocation/role boundaries, D1/R2 integration, customer enquiry flow, staff chat, approval protections and administration rendering.
- Storefront browser checks at 390/820/1440: no overflow, full-image fit, one-row mobile utilities, no public footer contact details, enabled announcement, scroll direction behaviour, in-flow search, full bag and reward progress.
- Browser audit for Owner, Sales, Support, Fulfilment, Catalogue and Analyst: light theme, desktop/mobile bounds, shared portal, searchable guides and lookup permission visibility. Corrected dark owner mobile controls found during visual review.
- Two-session chat test confirms messages arrive and remain channel-specific.
- Static package verification covers 697 pages, 682 privacy-safe product shells and 3,724 existing studio photographs.

Browser checks use isolated fixtures. No customer messages, sales, orders or payment records were created in production. Namecheap frontend requires owner upload/extraction of the delivered ZIP; Worker is deployed separately.
