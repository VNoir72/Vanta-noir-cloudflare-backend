# Security protections after source audit

Release tracking: PR #58, codex/security-verification-2026-10-07. Production activation is separate from verification. Consult the PR and its linked Actions run for the final release status.
Base audited source: 04ebd3e6c5955e3b231b21b60ec6426b16b03099.

The Cloudflare security-audit workflow re-reviewed 22 units across 124 files. It retained three independently verified source-supported leads as needs_validation, with no confirmed vulnerabilities under its runtime-evidence requirement. Existing role/owner approval, signed payment and email controls remain intact.

## Implemented

- Construct storefront redirects from the trusted base and assign pathname/search, preventing path input from selecting another origin. Apply normal response headers.
- Require exp on Access application JWTs alongside existing issuer/audience/RS256 checks. This is defense in depth; no usable provider-issued missing-exp token was demonstrated.
- Limit confirmation/unsubscribe actions to20 per IP per10 minutes, separate from newsletter signup rate limits. Valid repeats stay idempotent within that budget.
- Coalesce shared commerce maintenance using a D1 store_meta lease:5-minute crash expiry,60-second cooldown after completion, and owner-token check on release. Request and cron callers share the same guard. No migration required.
- Recheck current capped promotion usage during the atomic paid-order decision. Keep payment recorded; exhausted offers enter existing paid_stock_review and do not allocate stock. Owner review is still required. No automatic refund, cancellation or customer charge is introduced.

## Verification and limits

- Separate source reviewer found no concrete defect in the changes.
- git diff --check passes; this is formatting validation, not execution.
- Added tests/security-hardening.test.mjs for trusted redirect origin, valid/missing/expired token cases, preference rate limit and retry state, simultaneous/expired maintenance leases, and late promotion payment allocation/idempotency.
- Local bwrap isolation was unavailable (NETLINK_ROUTE Operation not permitted). Verification moved to a GitHub-hosted Docker job with external networking disabled, read-only source/root, an empty allowlisted environment, no credentials/capabilities, and CPU, memory, process, disk and time limits. Parent-side promotion retains only bounded, regular, single-link allowlisted artifacts after container termination.
- Initial isolated run 37563705540 passed typecheck, all 121 tests, backend build/verification, 697 generated pages, 22,426 local links/assets and archive tests. It stopped at browser startup because ANSI formatting broke the readiness-text match. The harness now matches the server address and disables colour formatting.
- Additional regressions cover configured mocked-email failure/retry and replacement-holder lease preservation. Browser checks cover mobile/tablet/desktop customer routes, six staff roles, chat, support, sales and navigation. See the final Actions evidence for these checks; mocked providers do not establish real notification delivery.
- A notification queued during a lease/cooldown waits for the next eligible request or scheduled maintenance. Cron runs every5 minutes; do not promise immediate delivery or a60-second maximum.
- Read-only Cloudflare review confirmed the deployed Worker, expected bindings, matching Access audience/application and five-minute schedule. Access policies use owner email/active-staff evaluation. A registry advisory report is collected during dependency provisioning. No live payments, messages, bookings or customer records were changed by testing.

## Required before release

In a compliant isolated environment with locally available dependencies and dummy services:
1. Run node --test tests/security-hardening.test.mjs.
2. Run existing payment-hardening, rewards, staff-approvals, email-delivery and commerce suites; include configured mocked-email maintenance recovery/failure scenarios.
3. Run typecheck, backend build and verify:release.
4. Verify the staged Worker revision and provider configuration by owner observation. Only then deploy.

The source audit describes the pre-change ref; passing remediation regressions do not retroactively establish a confirmed exploit in that revision. The Namecheap update is a code-repair package that retains existing photographs. UI search/header/portal proposals remain separate and unimplemented pending visual approval.

## Dependency advisory review

Registry scan on 2026-10-07 initially returned 13 high alerts arising from three underlying advisories. Sharp is upgraded to 0.35.5 (including nested copies via override), and source-map-js to 1.2.2, their patched versions. No forced framework downgrade is used.

GHSA-vfj7-8cjw-p6xm (braces <=3.0.3) has no upstream patched version. Its remaining chain is development-only: lint/build glob tooling consumes repository-controlled patterns, not customer input. The release ships compiled files rather than these development modules. CI has no external network and bounded resources. The advisory gate rejects any affected runtime node or any additional advisory; this exception is specific to that published advisory. This is containment and an explicit unresolved upstream dependency, not a claim of zero alerts.

References: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm ; https://github.com/advisories/GHSA-wq5f-xc86-pv6w ; https://github.com/advisories/GHSA-68fv-2mgg-jv7q .

Expanded run 37564631968 passed all 122 tests (including configured mocked-email recovery and stale-holder protection), all seven browser suites and 45 page/viewport checks. Its full photograph archive exceeded the sandbox file-size limit. The workflow now produces the existing code-repair format, retaining deployed photographs and preserving the limit. Final verification is linked from PR #58.
