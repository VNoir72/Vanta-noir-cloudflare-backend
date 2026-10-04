# Staff login and management correction

Owner approval on 4 October 2026 explicitly covers all current and future staff.

## Login policy

Cloudflare one-time PIN is enabled for the admin application. The previous policy included the owner email and an external-evaluation rule, but did not provide a separate email-login match for staff. Cloudflare can withhold OTP delivery for addresses not matched before authentication.

Added an application policy that includes the configured one-time-PIN login method and **requires** the signed external evaluation at `/api/access/evaluate`. The evaluator checks the live `admin_staff` table. There is no fixed staff-email list: future enabled staff use the same path. Unknown, disabled and deleted staff must fail the external evaluation. Backend authentication also checks current staff membership on requests. Owner access remains in its existing policy.

The new policy is `2a501680-016d-41f9-8954-9c1a9586db9d`, attached to admin application `6a3497c9-b778-414f-9831-01330c41a7d0`. No OTP emails were sent by this maintenance task. Actual inbox delivery and completion of sign-in require the staff member to request and enter their own code.

## Staff screen

- One dedicated Add staff form; it clears after successful addition.
- Saved staff are read-only rows with their email, role and enabled status.
- Saved rows show Edit and Delete, without a permanent Save button.
- Edit exposes Save changes and Cancel. Save changes stays disabled until something changes.
- Duplicate email additions are blocked and direct the owner to Edit.
- Delete confirms the exact address; the backend revokes access and rejects pending requests while retaining audit history.
- Email replacement remains delete-old/add-new; an editable email cannot accidentally leave the old address enabled.
- Field help and sign-in instructions match the new actions.

Cloudflare configuration and the admin Worker are the only deployment targets for this correction. No Namecheap upload is needed for these admin changes.

## Verification

Typecheck passed. The staff approval/authentication integration test passed, including signed external evaluation, unknown-email denial, expired/forged-token denial and revocation. Browser tests used the actual admin component and isolated compiled backend: two successive additions, form reset, duplicate email guard, unchanged-save disabling, edit cancellation, saved disabling, cancelled/confirmed deletion, database persistence, clean navigation, no JavaScript errors and no horizontal overflow at 390/1194/1722px. No production staff records were altered for testing.
