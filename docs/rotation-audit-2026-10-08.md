# Rotation audit — 8 October 2026

Status: local corrections; not deployed. Production admin visual verification is blocked by browser credential protection. This is not a complete live or physical iPhone Safari audit.

## Confirmed findings

1. Shared dialogs inherited the default `transition-property: all` with a 200 ms duration. With the filter already open, rapid changes from 390×844 to 844×390 produced a transient panel around y=-13 and height=415, outside the 390 px viewport. It eventually fitted correctly; document-width checks alone missed this. Restricting transitions to opacity and transform makes viewport geometry update immediately. The overlay animations remain.
2. The admin product editor sheet had glass, but its nested form used almost opaque pearl fill. Restrict the transparent form correction to the product sheet, and retain translucent sticky save/footer surfaces. Order forms and the control layout are unchanged. Solid accessibility fallback still comes from the existing shared material tokens.

## Verification

Local React production components with mocked catalogue/admin responses, Chromium, no production data mutations. Repeated portrait/landscape and breakpoint changes include 320×568, 568×320, 390×844, 844×390, 820×1180, 1180×820, 1023×768 and 1024×768.

Exploratory checks covered overview, launch review, open navigation, product editor, storefront home, search, filters and bag (120 viewport changes per pass, both rapid and settled passes). The settled pass found no persistent dialog-bounds failures or runtime exceptions in these states. Early drawer screenshots during opening are animation frames, not evidence of persistent clipping.

The targeted regression test checks 24 viewport changes for each of filters, quick shop, bag and product editor (96 total), overlay bounds, document overflow, Apply/Close/Escape, unsaved editor text preservation and discard protection, transparent form fill and runtime exceptions. Run from repository root with Playwright and Chromium installed:

`node tests/browser/rotation-regression.cjs`

Set `CHROMIUM_EXECUTABLE` if Chromium is not at `/tmp/chromium`.

## Still unverified

Authenticated production admin; physical iPhone/iPad Safari rotation, browser-toolbar collapse, keyboard and safe-area behavior; every admin section and all storefront purchase flows. The live storefront was opened and showed the existing static technical duo hero; subsequent browser inspection was restricted. These changes do not implement the pending five-scene video/carousel.

## Expanded device matrix

Follow-up: authenticated live admin access briefly resumed after the owner handoff. At 1363×936 the sidebar, workspace bar and revenue panel had translucent gradients and 6–12 px blur. The botanical backdrop was not clearly visible in the screenshot; this alone does not establish an asset failure. Browser credential protection blocked subsequent inspection again. Live orientation changes were not performed: the available cloud-browser API does not expose viewport rotation.

The extended local matrix uses both orientations of 320×568, 375×812, 390×844, 414×896, 430×932, 744×1133, 768×1024, 810×1080, 820×1180, 834×1194, 1024×1366, 1080×1920 and 900×1440, plus the 1023/1024 breakpoint. Three repetitions give 84 changes per overlay, 336 per mode. Modes: desktop Chromium and touch/mobile Chromium with a viewport meta tag and device scale factor 2. These are layout profiles, not actual Apple hardware or WebKit.

Run extended desktop checks with `EXTENDED_ROTATION=1 node tests/browser/rotation-regression.cjs`; add `TOUCH_ROTATION=1` for the touch/mobile pass.

Result: both extended modes passed all four overlay checks (672 viewport changes total), with no runtime exceptions. Apply/Close/Escape, editor text preservation and the unsaved-change guard passed. Changes remain local and undeployed.

## Owner recording: IMG_3335.mov

The 21.8-second recording shows the botanical/glass appearance in portrait and a flat-looking dashboard in landscape. Earlier bounds tests did not detect this visual inconsistency. Source CSS used a fixed pseudo-element below 1024 px, but switched to `background-attachment: fixed` at wider widths. The correction retains one fixed pseudo-element behind the admin at every width, rather than swapping rendering methods. Controls and layout breakpoints are unchanged.

Local rendered screenshots inspected at 820×1180 and 1180×820 now show leaves behind the glass in both orientations. The layer is also present at 390×844, 844×390, 1024×1366, 1366×1024, 1080×1920 and 1920×1080. Regression assertions now check the backdrop across widths, not just overflow. Actual Safari verification and deployment remain outstanding.
