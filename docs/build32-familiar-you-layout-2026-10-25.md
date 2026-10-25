# Familiar You layout and simpler Settings

Restores the compact pre-redesign You layout: profile at the left of the top row, country flag and notification bell at the right, then orders, the familiar shortcut list, reviews and app benefits. Spacing and separators are consistent. The newer account loading/retry protection and preorder fixes remain.

Profile, addresses and membership open directly and return to You. Account detail navigation keeps its actual origin instead of always returning to Settings; the Android back handler uses the same history. Legacy links to removed settings panels resolve to the simplified Settings page.

Settings no longer repeats Profile, addresses, orders, country, notifications, membership, calendar or help for signed-in customers. General settings and nested media/notification menus are removed. Image quality, autoplay and privacy choices are directly on the main Settings page; security, viewed pieces, about, sign-out and account deletion remain accessible. The fixed-English information row, duplicate phone-settings links and network-acceleration settings screen are removed. Existing network-fallback preferences and behavior are preserved.

Notifications retains its original position and push switch; its duplicate order-settings link is replaced with the direct email-subscription page. Profile text now correctly explains that saved details sync across app and website.

Validation: TypeScript and Expo lint pass. All 45 mobile tests pass, including direct Profile return, nested detail history and legacy-link handling. React Native Web preview with isolated dummy services checked original country/notification controls, direct Profile → You, and Settings → Security → Profile → Security → Settings. Physical Android interaction was not tested. No production customer data was changed.

OTA: existing Android production workflow, exact build 32 runtime `9829b16b33975c503904e03aebd352fa673a78ca`, with compatibility guard and full mobile regression suite before publication. No native dependencies or build configuration changed.
