# Circle, carousel and inventory update — 12 October 2026

Owner clarification: charge NGN, not USD. Monthly price is ₦5,000, editable in admin. Yearly is a separate optional offer, initially disabled with no invented yearly price. New provider plans preserve existing subscribers' agreed prices. Circle remains app-only; activation still requires actual benefits, a validated provider plan and payment lifecycle checks.

Carousel: retain the original floating burgundy campaign on pearl ribbons. Preserve four independently configurable backgrounds/contents. Disable slots 2–4 and keep first-slide-only enabled. Admin can restore slots, select featured products or uploaded media, float images over backgrounds, or show a background alone. Explicit slot configuration takes precedence over legacy automatic modes. Single-slide display has no carousel pagination.

Inventory: expose the existing stock panel as Inventory and add it to the mobile quick navigation. No inventory quantities are changed.

Checks: root/mobile TypeScript, mobile lint, targeted billing/hero/inventory tests, production builds. Browser verification and deployment results are recorded in the delivery response. Mobile source changes require an app release before installed clients receive the new controls.
