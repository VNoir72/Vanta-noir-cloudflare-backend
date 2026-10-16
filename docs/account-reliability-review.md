# Account reliability review

- Local mobile sign-out no longer depends on successful push unregistration or server logout. Remote cleanup is best effort; offline remote revocation cannot be guaranteed.
- Browser sign-out clears local account state and blocks residual session-cookie use through customer request headers until a fresh login. Late requests cannot restore a changed session.
- Sign-in initialization errors describe service availability rather than assuming a network fault; retry clears the previous error.
- Signed-in website favourites now use the shared account list. Saves read the latest list first and do not report success if persistence fails.
- Profile/address, orders and membership isolation were checked with integration fixtures.
- Verification and reset email branding, identity checks, provider failures and retry limits were checked with fixtures. Inbox placement is outside these tests.

Validation: mobile lint and typecheck; website typecheck and production build; 28 focused tests. Installed-device and real customer inbox acceptance were not performed.
