# Vanta Noir release and sign-in activation

Prepared 2026-10-11. Configuration is not proof of a released binary or successful device login.

## Upload the website

Use Vanta-Noir-Website-Update-2026-10-11.zip (full public storefront, about 328 MiB). It contains index.html directly at its root, not the repository. It excludes backend secrets, source and the database. It includes the website visuals and static SEO work, not a Cloudflare backend deployment or an Android APK.

1. Sign into Namecheap and open cPanel. In Domains, identify the actual Document Root for vantanoir.store. Do not guess between similarly named public_html folders.
2. Back up that document root outside the public folder, using cPanel Backup or File Manager's Compress, and download a copy. Keep the existing site until the backup is confirmed.
3. Open that document root in File Manager. Enable Show Hidden Files so .htaccess is visible.
4. Upload the ZIP, select Extract, and choose that exact document root. Allow matching release files to overwrite. If prompted, preserve unrelated verification files and .well-known. Do not delete the entire public_html directory.
5. Check that index.html, store-config.js, .htaccess, assets and images are directly in the domain root, not in a nested ZIP-name folder. Archive permissions are files 0644 and folders 0755.
6. Remove the uploaded ZIP from the public folder after extraction. Open https://vantanoir.store in a private tab and refresh. Test home, product colour/size, search, bag, checkout entry, legal pages and a deliberately invalid URL. Do not place a paid test order unintentionally.
7. If the site fails, restore the backup to the same document root. Send the visible error and URL for diagnosis. A continuing Namecheap account restriction must be resolved with Namecheap support.

## Firebase now

Project: vanta-noir. Google and Email/Password are already enabled. Android and iOS apps are registered; the Android certificate fingerprint is configured. Firebase Admin credentials are already stored in Cloudflare, and the FCM V1 credential is installed in Expo. Do not generate another private key or upload one into public_html.

No further user-side Firebase setup is required for the current Google/password integration. Backend deployment with FIREBASE_AUTH_ENABLED=true and a compatible new app build are still required. The existing installed 0.1.9 APK does not acquire native Firebase modules through a JavaScript-only update. Validate first account creation, verification email, Google login, password reset, logout and deletion on a device after deployment.

## Apple later — iOS app

The native iOS implementation is prepared and disabled. Apple sign-in on Android/web is not implemented by this native iOS module. Keep the Apple flag off until the following configuration and real-device tests pass.

1. Enroll at https://developer.apple.com/programs/enroll/ when ready. Membership is currently US$99/year, with regional pricing. For an organization account, use the registered legal entity and follow Apple's organization verification requirements.
2. In Certificates, Identifiers & Profiles, register or select the App ID with bundle ID store.vantanoir.shop. Enable Sign in with Apple as a primary App ID. Keep this exact bundle ID in Firebase and Expo.
3. Create an Apple Services ID (choose an available identifier, for example store.vantanoir.shop.signin), enable Sign in with Apple, and associate it with the primary App ID. Configure domain vanta-noir.firebaseapp.com and return URL https://vanta-noir.firebaseapp.com/__/auth/handler.
4. Create a key with Sign in with Apple enabled and associated with that App ID. Save its .p8 file securely; record its Key ID and your Team ID. Never commit the private key or place it in the website ZIP.
5. Firebase Console > vanta-noir > Authentication > Sign-in method > Apple: enable it. Enter the Services ID and the OAuth code-flow Team ID, Key ID and private key, then save. These settings also support token revocation during account deletion.
6. Configure Apple's private email relay with noreply@vanta-noir.firebaseapp.com, plus the verified sending addresses/domains actually used by Vanta Noir transactional email. Confirm Hide My Email users receive authentication and order messages.
7. Connect the Apple Developer team to EAS and create/refresh the iOS distribution signing credentials and provisioning profile with the Apple sign-in entitlement. The customer app configuration already includes usesAppleSignIn and the Expo Apple plugin.
8. Deploy the matching backend and enable FIREBASE_AUTH_ENABLED=true and FIREBASE_APPLE_ENABLED=true for testing. Build the iOS app from mobile using the production EAS profile and test through TestFlight before public release. Keep production Apple login off if tests fail.
9. Test Share My Email, Hide My Email, cancellation, repeat login, logout, expired sessions, existing-account collisions, email delivery and account deletion/revocation. Include deletion after signing in again by email code and from another device. No automatic merging of different email identities is promised.

The steps requiring Apple membership, signing credentials and a device cannot be completed or certified before that access exists.

## Expo builds

The current free quota resets on 2026-11-01 according to the account dashboard. Starter is currently US$19/month with US$45 build credit. Medium Android builds consume US$1, medium iOS US$2; large builders consume more. Usage beyond included credits is billed. Choose Starter in the Vanta Noir account Billing settings if you want cloud builds before reset; no subscription purchase was made here.

Sources checked 2026-10-11:
- https://docs.expo.dev/billing/plans/
- https://docs.expo.dev/billing/usage-based-pricing/
- https://docs.expo.dev/versions/v57.0.0/sdk/apple-authentication/
- https://firebase.google.com/docs/auth/ios/apple
- https://developer.apple.com/programs/enroll/
