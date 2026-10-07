# Security protections after source audit

Status: implemented in the working source; not built, runtime-tested, pushed or deployed.
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
- No target tests/builds/typecheck ran. The security skill requires OS-enforced no-network/read-only/limited-resource execution. bwrap failed: NETLINK_ROUTE Operation not permitted. That rule was not bypassed.
- Maintenance failure recovery, stale-holder release and actual email-configured recovery/send remain unexecuted. The fixture's email provider is deliberately unconfigured; it does not establish actual notification delivery.
- A notification queued during a lease/cooldown waits for the next eligible request or scheduled maintenance. Cron runs every5 minutes; do not promise immediate delivery or a60-second maximum.
- Live deployment identity, hosted access/routing policies and current dependency advisories were not audited live.

## Required before release

In a compliant isolated environment with locally available dependencies and dummy services:
1. Run node --test tests/security-hardening.test.mjs.
2. Run existing payment-hardening, rewards, staff-approvals, email-delivery and commerce suites; include configured mocked-email maintenance recovery/failure scenarios.
3. Run typecheck, backend build and verify:release.
4. Verify the staged Worker revision and provider configuration by owner observation. Only then deploy.

The source audit describes the pre-change ref. The remediation is not represented as runtime-verified or live. UI search/header/portal proposals remain separate and unimplemented pending visual approval.
