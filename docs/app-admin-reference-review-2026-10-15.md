# App and admin reference follow-up — 15 October 2026

## Requested changes
- Bag: country flag, saved-address entry, selected-item trash action, always-visible selection controls, smaller garment rows, checkout on the left and selected-items total on the right.
- You: profile photo is the single profile-edit entry; country beside the bell; appearance on You; remove duplicate profile/general-settings shortcuts.
- Settings: account deletion immediately before sign-out; input length limits; notification controls retained.
- Orders: compact horizontal action strip; existing paid/unpaid/restore policy unchanged. Saved product images are square to reduce page height.
- Accents: hero button, pagination, ribbons and particles use current brand; bag selection uses current accent; offline launches retain the last validated brand color; selected surfaces follow that accent.
- Notifications: request OS permission once for signed-in accounts, register by default if allowed, retain per-account device opt-out, detach token on sign-out without erasing preference. OS permission is never bypassed.
- Admin: compact metric/chart heights and subtle dark glass reflection. Shared semantic palette remains authoritative, with original spire logo.
- Staff/support: same compact surface tokens and narrow, hidden-when-closed mobile sidebar, right-hand toggle, side-by-side content and reduced-motion behavior; permissions are unchanged.

## Video review
Both supplied videos are prelaunch checklists, not recordings of Vanta Noir defects. Reviewed sampled frames across each full clip and final readable lists.

Checklist 1: onboarding, sign-up/login, email verification, password reset, account deletion, permissions, empty/loading/error/network states, persistence, payments, notifications, analytics, crash reporting, privacy, accessibility, responsiveness, user flows, beta testers.
Checklist 2: input edge cases, search states, long content, keyboard, denied permission, offline recovery, retries, time zones, date formats, double taps, destructive actions, logout, resume, slow APIs, abuse protection, upload limits, support, updates, data export, real devices.

Evidence: automated account/session, permission/RBAC, payment hardening/restart, order policies, bag selection, notification opt-out, theme and accent checks. Existing operation ref blocks duplicate payment actions; API timeout/retry handling and privacy opt-in remain in place. Added profile input caps, offline brand cache, default push preference tests and updated onboarding instructions.

Limits: automated checks do not prove native push delivery, real payment settlement, OS keyboard/screen-reader behavior, physical rotation or beta-user acceptance. No real customer account was deleted or charged in this review. Full self-service personal-data export remains a separate gap; current account data and receipts are accessible, but that is not a complete export. Do not describe the videos' entire launch checklist as passed without those checks.
