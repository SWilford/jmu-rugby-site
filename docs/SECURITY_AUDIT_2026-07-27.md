# JMU Men's Rugby Website Security Audit

**Audit date:** July 27, 2026
**Status:** S-01, S-04, S-05, S-06, S-07, and S-08 remediated; S-02 accepted with compensating controls; S-03 implemented; remaining findings are pending
**Repository:** `SWilford/jmu-rugby-site`
**Production site reviewed:** `https://www.jmumensrugbyclub.com`

## Executive summary

The site has a sound basic architecture for a small public club website: it is a static React application, secrets are not embedded in the tracked client code, all public Supabase tables have row-level security (RLS) enabled, mutating R2 actions require an authenticated administrator, HTTPS is enforced, and preview deployments are protected.

The audit nevertheless found **3 high, 7 medium, and 4 low-priority findings**. The most important issues are:

1. The live Supabase project has old permissive policies that allow **any authenticated user** to insert into three tables, and broad read policies expose inactive FAQ and sponsor records. These old policies override the newer admin-only/active-only policies because permissive RLS policies are combined with `OR`.
2. Neither of the two administrator accounts has MFA enrolled, and Supabase leaked-password protection is disabled.
3. `npm audit` reports 11 dependency advisories, including one critical and seven high advisories. Most of the critical/build-tool exposure is not served in the static production bundle, but it still creates developer workstation and software supply-chain risk.

No secret was found in tracked files or Git history using high-confidence secret patterns. No changes were made during the initial audit; the approved S-01, S-03, and S-04 work and the S-02 risk decision are recorded below.

## Implementation log

### July 28, 2026 — S-01 remediated

With owner approval, migration `20260728232351_fix_permissive_content_policies.sql` was applied to the production Supabase project.

- Removed seven obsolete permissive or duplicate policies from `join_content_faq`, `media`, and `sponsors`
- Preserved the intended public-read and administrator-only write policies
- Confirmed a simulated authenticated non-admin was blocked from inserting into all three tables
- Confirmed a simulated administrator could insert into all three tables; all test writes were rolled back
- Confirmed inactive FAQ and sponsor test rows were hidden from anonymous reads
- Confirmed zero test rows remained and production row counts were unchanged
- Confirmed the three `rls_policy_always_true` security-advisor warnings were cleared

No application deployment was required. All other findings remain unchanged and require separate discussion/approval.

### July 28, 2026 — S-02 accepted with compensating controls

The owner confirmed that the two website administrator accounts use unique, secure passwords; their email accounts are MFA-protected; the Supabase, GitHub, Vercel, and Cloudflare control-plane accounts are protected; and former officers' access is removed during transitions.

The Supabase organization is on the Free plan, where leaked-password protection is unavailable. Given the disabled public signup, two-admin scope, password hygiene, and confirmed operational controls, the owner accepted the remaining application-level MFA risk. Website-admin TOTP and a paid-plan upgrade will not be implemented now. The decision must be revisited if more administrators are added, private member data is introduced, or financial functionality becomes more substantial.

### July 28, 2026 — S-03 dependency remediation implemented

The approved patch/minor dependency update and runtime alignment were completed in the working tree:

- Pinned `@supabase/supabase-js` 2.111.0, `react-router-dom` 7.18.2, `supabase` CLI 2.110.0, Vite 7.3.6, ESLint 9.39.5, and `@eslint/js` 9.39.5
- Declared Node.js 22.12 or newer and updated both GitHub Actions workflows from Node.js 20 to Node.js 22
- Regenerated the lockfile and completed a clean `npm ci`
- Reduced the audit result from 11 advisories, including one critical, to no critical, moderate, or low advisories
- Documented the two remaining non-reachable advisory situations below instead of forcing unapproved React Router 8 and ESLint 10 major upgrades
- Passed lint, all 10 automated tests, the production build, HTTP checks for every public route and `/admin`, and live anonymous Supabase reads

The visual browser and console regression pass could not run because no browser was connected to the workspace. Authenticated administrator editors and R2 upload/download/delete were therefore not exercised end-to-end in this pass. The changes were subsequently committed, pushed, deployed, and verified on production.

### July 28, 2026 — S-04 R2 Edge Function hardened

With owner approval, version 6 of the `r2-media` Supabase Edge Function was deployed to production with JWT verification enabled.

- Removed the public `sign-download` action; public media downloads now use the existing R2 custom domain and a temporary browser Blob
- Moved all remaining actions (`sign-upload`, `delete-objects`, and `move-object`) behind the existing validated-user and `is_admin()` authorization check
- Removed the service-role authorization fallback and confirmed `is_admin()` returns true for a simulated administrator and false for a simulated non-administrator
- Pinned the Edge Function's Supabase JS import to 2.111.0
- Added a 2 MiB request-body limit, an explicit action allowlist, runtime payload-type checks, `no-store` responses, stable public error codes, internal error logging, and request IDs for server failures
- Kept the owner-approved 12 MiB image-upload limit
- Confirmed the public R2 object endpoint returns the production site CORS origin, HTTP 200, and the expected image content type
- Confirmed the removed download-signing action returns 400, an anonymous upload-signing attempt returns 401, and a headerless function call is rejected by the Supabase gateway with 401
- Added three focused regression tests; lint, all 13 tests, and the production build pass

No R2 object was uploaded, moved, or deleted during verification. The Blob-first frontend change was subsequently committed, pushed, and deployed.

A new persistent rate-limit service was not added. Removing the only public action leaves a JWT-validated, administrator-only function used by two administrators, so that infrastructure is not proportionate at present. The function continues to accept requests without an `Origin` header because CORS is not an authorization boundary; JWT validation and `is_admin()` provide that boundary. Application-level AAL2 was not added, consistent with the accepted S-02 decision. Revisit these decisions if the function becomes public again, administrator count or traffic grows, or abuse appears in logs.

### July 28, 2026 — S-05 Content Security Policy implemented

With owner approval, an enforced Content Security Policy was added to the global Vercel response headers after a report-only validation pass against the production build.

- Allows executable scripts only from the site's own origin; inline scripts, evaluated code, data scripts, Blob scripts, and third-party scripts remain blocked
- Allows stylesheets and fonts only from the site's own origin while retaining inline style attributes required by React and Framer Motion
- Limits browser connections to the site, Supabase, the public R2 media domain, and the exact R2 signed-upload endpoint
- Limits images to the site, temporary browser Blobs, Supabase, the R2 media domain, and the currently used QR provider
- Allows frames only from Instagram and blocks every site from framing this application
- Blocks plugins/embedded objects, base-tag injection, off-site form submissions, and workers
- Upgrades insecure subresource requests
- Adds three regression tests that lock the reviewed policy and prevent weakening the JavaScript directives
- Reuses the Vercel header configuration in the local production-preview server so future CSP changes can be exercised before release

The report-only build rendered every public route and the administrator sign-in surface without a CSP violation. The homepage Instagram embed, Join page video, donation QR image, Supabase-backed content reads, and local assets rendered under the reviewed allowlist. The external QR origin is a temporary exception pending S-12.

The enforced configuration passes all 16 automated tests, lint, and the production build. Authenticated administrator editors and a real R2 upload/delete/move were not exercised because no administrator credentials or disposable media object were used in this pass; their required Supabase and R2 endpoints are explicitly covered by `connect-src`. The change was subsequently committed, pushed, deployed, and verified on production.

### July 28, 2026 — S-06 migration baseline implemented

With owner approval, the live Supabase catalog was captured as an ordered,
data-free migration baseline.

- Added `20260728000000_baseline_live_schema.sql` before the tracked S-01
  remediation migration
- Captured all 11 public tables, 75 columns, indexes, constraints, functions,
  six update triggers, RLS configuration, 54 public policies, 12 legacy Storage
  policies, and the current grants
- Added `supabase/config.toml` and declared the legacy `rugby-media` bucket for
  reproducible local environments
- Added an automated disposable-PostgreSQL rebuild that runs the complete
  migration chain and verifies table/column structure, RLS, policy counts,
  grants, zero copied content, and migration ordering
- Marked every manually run `docs/supabase_*.sql` file as historical and added
  a migration/rollback runbook
- Recorded `20260728000000_baseline_live_schema` as already applied in
  production migration history; the baseline SQL was not executed against the
  existing production schema
- Verified production history now contains the baseline followed by
  `20260728232351_fix_permissive_content_policies`

No production table, policy, function, grant, Auth user, website-content row, or
Storage object was changed. A full Supabase CLI reset was unavailable because
Docker is not installed in this workspace; the chain was instead executed in an
in-process PostgreSQL database with the required Supabase roles and Auth/Storage
prerequisites.

### July 30, 2026 — S-07 production assets migrated to R2

With owner approval, the two sponsor logos still referenced through Supabase
Storage were copied into the existing `rugby-media` Cloudflare R2 bucket:

- `sponsors/jmhj2.jpg` — 15,575 bytes; source and R2 SHA-256
  `f26a853932fc102b7d60d933270f58b3ed6054ea37d09225fcadb0804658eabe`
- `sponsors/jcmrf.jpg` — 46,800 bytes; source and R2 SHA-256
  `8cf6112013767e53952e5085a368aed961ec02386e5bf3be018320a3c4dbc9f6`

The production sponsor records now store the relative R2 object paths, and the
homepage footer was verified to render both images from
`media.jmumensrugbyclub.com` with valid dimensions and no related browser
errors. The data update is represented by
`20260731014725_migrate_sponsor_logos_to_r2.sql`, matching production migration
history.

The Supabase copies, remaining legacy objects, bucket, and policies have not
been deleted. They are retained as rollback material until the owner separately
approves destructive cleanup. The Supabase advisor will continue to report the
public-bucket-listing warning until that cleanup is completed.

### July 30, 2026 — S-07 legacy Supabase Storage retired

After separate owner approval for destructive cleanup, the final inventory found
13 objects totaling 28,824,116 bytes: nine files and four empty-folder markers.
Only the two already migrated sponsor paths remained referenced in production.

- Downloaded and hash-verified all 13 objects before deletion
- Created the recoverable archive
  `S07-supabase-rugby-media-2026-07-30.zip` outside the repository
- Recorded every object path, byte length, and SHA-256 in the archive manifest
- Verified the archive contains all 13 objects; archive SHA-256 is
  `75f1d6ee008694638c7fd55eb0153e4cf570c5003b279d6bd99cf4d40dd93884`
- Emptied and deleted the Supabase bucket through the Storage API
- Removed all 12 obsolete `storage.objects` policies through
  `20260731020959_retire_legacy_supabase_storage.sql`
- Removed the legacy bucket declaration from `supabase/config.toml`
- Restored the production `r2-media` Edge Function to its reviewed code with
  JWT verification enabled and confirmed anonymous requests still return 401
- Confirmed the Supabase bucket, objects, and related policies are absent and
  the public-bucket-listing advisor warning is gone
- Confirmed the homepage, Media page, and Team page contain no Supabase Storage
  URL; both sponsor logos render from R2 with valid dimensions

### August 24, 2026 — S-08 GitHub repository hardening

With owner approval, the repository and GitHub security configuration were
hardened. The owner's GitHub MFA was already enabled and did not require a
change.

- Granted workflows read-only repository contents by default and prevented
  workflows from approving pull requests
- Pinned every GitHub Action to a reviewed immutable commit SHA while retaining
  version comments for maintainability
- Added weekly Dependabot coverage for npm and GitHub Actions dependencies
- Added pull-request dependency review that rejects moderate-or-higher newly
  introduced vulnerabilities
- Added weekly and change-triggered CodeQL analysis for JavaScript/TypeScript
- Added a private vulnerability reporting policy and response expectations in
  `SECURITY.md`
- Enabled secret scanning, push protection, Dependabot alerts and security
  updates, and GitHub private vulnerability reporting
- Added a default-branch ruleset requiring pull requests, successful CI and
  dependency review, and resolved review conversations while blocking branch
  deletion and force pushes; repository administrators have pull-request-only
  emergency bypass
- Deliberately left required approvals at zero because this is currently a
  one-maintainer repository; signed commits are not required
- Added focused regression tests for workflow permissions, immutable action
  pins, Dependabot, CodeQL, dependency review, and disclosure guidance

All 20 automated tests, lint, the production build, and the production-only npm
audit pass. The build continues to emit the existing large-chunk performance
warning, which is not a direct security finding.

## Scope and method

This was a point-in-time, read-only review of:

- The complete local repository and Git history
- The live Supabase project, including tables, policies, functions, storage, authentication settings, advisors, and migration history
- The Cloudflare zones and R2 bucket used by the site
- The Vercel project, production deployment, domains, deployment protection, and live response behavior
- The public GitHub repository and workflow files
- The production website's redirects, response headers, sensitive-path behavior, and media delivery
- Dependency health, lint, automated tests, and production build

Checks performed included:

- High-confidence secret pattern scans of the working tree, tracked files, and Git history
- `npm audit` and outdated-package review
- Source review for XSS sinks, unsafe URL handling, authentication/authorization boundaries, upload controls, CORS, error leakage, and security headers
- Read-only SQL inspection of live RLS policies, grants, security-definer functions, Auth users, MFA factors, and storage configuration
- Supabase security and performance advisor inspection
- Cloudflare DNS, R2 CORS/custom domain, ruleset inventory, and live cache/TLS behavior
- Vercel deployment and protection inventory plus live HTTP probes
- GitHub workflow and repository security-file review
- `npm run lint`, `npm run test:ci`, and `npm run build`

### Limitations

- Cloudflare returned the existence of zone rulesets but the connected account scope did not permit reading every rule expression or zone setting.
- The Vercel connector did not expose the project's live Firewall rule configuration.
- GitHub branch protection, organization/member 2FA enforcement, and some advanced security settings could not be verified without authenticated administrative repository access.
- Gitleaks, Semgrep, and Trivy were not installed. The audit used repository searches, dependency auditing, code review, and provider-native advisors instead.
- This was not a destructive penetration test. No brute force, denial-of-service, upload abuse, credential attack, or unauthorized write was attempted.

## Risk register

| ID | Severity | Finding | Current exposure |
|---|---|---|---|
| S-01 | High | Live Supabase RLS policy drift permits unintended writes and reads | Remediated July 28 |
| S-02 | Medium | Admin accounts lack MFA; leaked-password protection is off | Accepted with compensating controls |
| S-03 | Low residual | Direct and transitive dependencies have known advisories | Deployed; two non-reachable exceptions |
| S-04 | Low residual | R2 signing Edge Function needs abuse and error hardening | Remediated in production July 28 |
| S-05 | Low residual | Production lacks a Content Security Policy | Remediated July 28 |
| S-06 | Medium | Database changes are not represented in migration history | Remediated July 28 |
| S-07 | Remediated | Legacy public Supabase Storage bucket allows listing and lacks limits | Remediated July 30 |
| S-08 | Remediated | GitHub Actions and repository security controls need hardening | Remediated August 24 |
| S-09 | Medium | Main site bypasses Cloudflare proxy; provider firewall rules need manual verification | Confirmed/verification needed |
| S-10 | Medium | Database grants and function execution are broader than necessary | Confirmed |
| S-11 | Low | SPA fallback returns `200` for nonexistent sensitive paths | Confirmed |
| S-12 | Low | Third-party QR generation leaks request metadata | Confirmed |
| S-13 | Low | Security monitoring and incident-response ownership are not documented | Confirmed |
| S-14 | Low | Environment-variable onboarding and rotation inventory are incomplete | Confirmed |

## Detailed findings and proposed changes

### S-01 — Live Supabase RLS policy drift

**Severity:** High
**Status:** Remediated and verified July 28, 2026

#### Evidence

All 11 public tables have RLS enabled, which is good. However, the live database still contains legacy policies named `Enable insert for authenticated users only` with `WITH CHECK (true)` on:

- `public.join_content_faq`
- `public.media`
- `public.sponsors`

These policies coexist with the intended `public.is_admin()` insert policies. PostgreSQL permissive policies are combined using `OR`, so the legacy policy allows any authenticated account to insert regardless of administrator status.

There are also broad `Enable read access for all users` policies. On `join_content_faq` and `sponsors`, those broad policies bypass the newer `is_active = true` public-read condition, making inactive records readable through the API.

Public signup is currently disabled and both existing Auth users are administrators. That reduces immediate exploitability, but does not make the policies safe: a future non-admin account, accidentally re-enabled signup, or compromised authenticated account would activate the exposure.

Supabase's security advisor independently reported the three permissive insert policies. Supabase documents that RLS must protect tables in exposed schemas and that grants should be limited to required operations: [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

#### Impact

- Unauthorized content creation by any authenticated account
- Exposure of inactive FAQ and sponsor content
- Unpredictable authorization as duplicate policies accumulate
- Higher chance of future changes silently weakening access controls

#### Proposed change

Create and review one idempotent Supabase migration that:

1. Drops the exact legacy permissive policies.
2. Consolidates each operation to one intentional policy per role/use case.
3. Keeps public reads only where needed; for FAQ and sponsors, restrict public reads to active rows.
4. Keeps all inserts, updates, and deletes administrator-only.
5. Adds automated negative tests for anonymous, authenticated non-admin, and authenticated admin sessions.

Do not apply the existing SQL snippets blindly. First export the live schema/policies and turn the desired final state into a reviewed migration.

#### Acceptance tests

- Anonymous users can read only intended public rows.
- Anonymous and authenticated non-admin users cannot insert/update/delete any managed content.
- Inactive FAQ and sponsor records are invisible to anonymous and non-admin clients.
- Administrators can complete every editor action.
- Supabase security advisor no longer reports the three permissive insert policies.

### S-02 — Admin accounts lack MFA; leaked-password protection is off

**Severity:** Medium after compensating controls (originally High)
**Status:** Accepted risk July 28, 2026

#### Evidence

- The live project has two Auth users and two administrator rows.
- Neither user has a verified TOTP factor.
- The admin UI accepts email and password only.
- Supabase leaked-password protection is disabled.
- Public signup is disabled and email confirmation is required, which are positive controls.

Supabase calls MFA a best practice and supports enforcement using the JWT authenticator assurance level (`aal2`): [Supabase MFA guidance](https://supabase.com/docs/guides/auth/auth-mfa). Its security advisor also recommends leaked-password protection: [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

#### Impact

A reused, phished, or breached password can provide full content and media administration. The administrator role can change public-facing links, including donation destinations.

#### Proposed change

1. Add TOTP enrollment, challenge, recovery guidance, and factor-management UI.
2. Require `aal2` for all administrator database writes and Edge Function mutation actions, not only in the React UI.
3. Enroll both administrators before enforcement is turned on.
4. Enable leaked-password protection.
5. Review password length/settings and revoke existing sessions after rollout.
6. Establish a documented admin removal and officer-transition process.

#### Acceptance tests

- An `aal1` session cannot perform an administrator write even by calling Supabase directly.
- Both current administrators can enroll, sign in, recover, and remove/replace a factor through the approved process.
- Lost-factor recovery cannot bypass administrator identity verification.
- Leaked-password protection is enabled and advisor finding is cleared.

### S-03 — Known dependency advisories

**Severity:** Low residual after remediation (originally High)
**Status:** Implemented and deployed July 28, 2026

#### Evidence

`npm audit --json` reported:

| Severity | Count |
|---|---:|
| Critical | 1 |
| High | 7 |
| Moderate | 1 |
| Low | 2 |
| **Total** | **11** |

Affected packages include direct dependencies `react-router-dom` and `vite`, the direct development dependency `supabase`, and transitive packages `tar`, `postcss`, `js-yaml`, `brace-expansion`, `ws`, `esbuild`, and `@babel/core`.

The critical advisory is in `tar`, pulled through the Supabase CLI development dependency. Many React Router advisories concern server/framework/data-mode behavior not used by this static `BrowserRouter` application, and Vite/Supabase CLI are not shipped as production browser code. This lowers public runtime exposure but does not remove build, CI, and developer-machine risk.

#### Proposed change

In a dedicated dependency-update branch:

1. Upgrade patch/minor versions first, including React Router, Vite, Supabase JS, and Supabase CLI.
2. Run `npm audit` again and review every remaining advisory for actual reachability.
3. Run lint, tests, production build, and full admin/public regression checks.
4. Review release notes and lockfile changes before merge.
5. Add Dependabot or Renovate and a scheduled dependency-audit job.
6. Pin the Edge Function JSR import from floating `jsr:@supabase/supabase-js@2` to an exact reviewed version.

#### Acceptance tests

- No critical/high advisory remains without a written reachability/risk exception.
- Public routes, authentication, every admin editor, R2 upload/download/delete, and deployment still work.
- Lockfile is committed and CI installs with `npm ci`.

#### Remediation result

The working tree now pins the reviewed patch/minor releases listed in the implementation log, aligns local and CI execution on Node.js 22.12 or newer, and contains the regenerated lockfile. A clean install, lint, all 10 automated tests, and the production build pass.

The remaining seven high-severity package nodes reported by `npm audit` map to only two advisory situations:

1. **React Router RSC advisory (`GHSA-qwww-vcr4-c8h2`).** The upstream advisory states that only applications using React Server Components are affected. This site uses a static client-side `BrowserRouter` and has no RSC or React Router framework/data-router implementation, so the vulnerable path is not reachable. The patched line requires a React Router 8 major-version upgrade and is deferred.
2. **`brace-expansion` advisory (`GHSA-mh99-v99m-4gvg`).** This is present only through ESLint's development-time glob processing. Exploitation requires attacker-controlled brace/glob input; this repository invokes ESLint with trusted repository paths and configuration, and the package is not shipped in the production browser bundle. Clearing the audit entry requires an ESLint 10 major-version upgrade and is deferred.

These are documented reachability exceptions, not claims that the upstream vulnerabilities are fixed. They must be re-evaluated if the application adopts React Server Components, passes untrusted glob patterns into tooling, or performs the deferred major upgrades.

HTTP smoke checks returned the application shell for `/`, `/about`, `/team`, `/schedule`, `/media`, `/join`, `/contact`, `/donate`, and `/admin`; live anonymous reads of FAQ, media, and sponsor content also succeeded. The unavailable browser session prevented a visual/console check and authenticated administrator/R2 end-to-end testing. The dependency changes were subsequently committed, pushed, deployed, and verified on production.

### S-04 — R2 signing Edge Function abuse and error hardening

**Severity:** Low residual after remediation (originally Medium)
**Status:** Remediated in production July 28, 2026

#### Evidence

Positive controls include an image MIME allowlist, a 12 MB default signed-upload limit, object-path validation, short 60-second download signatures, explicit browser-origin allowlisting, and administrator checks for upload/delete/move.

Remaining concerns:

- `sign-download` is unauthenticated and can be called for any syntactically valid object path.
- No application-level rate limit is present.
- Requests with no `Origin` header are accepted; CORS is not an authentication control.
- Caught provider error text is returned to clients, which may expose operational details.
- If the normal `is_admin` RPC fails, the function falls back to a service-role query. The fallback is not currently an escalation, but it expands privileged code and can mask authorization drift.
- The Supabase JS JSR import floats on major version `2`.

#### Impact

Attackers can automate signed URL generation, enumerate guessed paths, create provider cost/noise, and potentially learn internal error information. Mutation actions remain administrator-protected based on the reviewed code.

#### Remediation result

Production Edge Function version 6 removes `sign-download`; every remaining action requires a valid user session and a successful `is_admin()` result. Public media downloads use the already-public R2 custom domain and a temporary browser Blob, eliminating public presigned-URL generation without removing the download experience.

The service-role fallback was removed after verifying `is_admin()` under simulated authenticated administrator and non-administrator claims. Provider errors are logged internally with a request ID while clients receive stable messages and codes. Responses are marked `no-store`, request bodies are capped at 2 MiB, supported actions are allowlisted, payload types are checked at runtime, and the Supabase JS JSR import is pinned to 2.111.0. The owner retained the 12 MiB upload limit.

The function remains deployed with Supabase `verify_jwt=true`. Live probes confirmed that `sign-download` returns 400, anonymous upload signing returns 401, and a request without authorization is rejected by the platform with 401. The R2 custom domain returned HTTP 200, `image/jpeg`, and `Access-Control-Allow-Origin: https://www.jmumensrugbyclub.com` for a representative public object.

No separate persistent rate limiter was added because the public action was removed and the remaining function surface is limited to two authenticated administrators. Supabase's platform rate limit for recursive or nested Edge Function calls does not cover ordinary inbound requests. If usage grows or abuse appears, place the function behind a durable limiter rather than relying on per-isolate memory.

Requests without an `Origin` header remain accepted because CORS is not an authentication mechanism and non-browser clients legitimately omit that header. JWT validation plus `is_admin()` is the security boundary. AAL2 was intentionally not added under the accepted S-02 decision. These choices are documented residual risks and must be revisited if exposure changes.

### S-05 — No Content Security Policy

**Severity:** Low residual after remediation (originally Medium)
**Status:** Remediated in production July 28, 2026

#### Evidence

At audit time, production sent HSTS, `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`, but no
`Content-Security-Policy`.

No `dangerouslySetInnerHTML`, `eval`, or `document.write` sink was found. A CSP is still valuable defense in depth against future injection, compromised dependencies, and unexpected third-party content.

#### Proposed change

1. Build a policy from the actual production dependency map.
2. Deploy `Content-Security-Policy-Report-Only` first.
3. Review violations across all pages and administrator workflows.
4. Enforce the narrowed policy after testing.

Expected directives will likely include `default-src 'self'`, restrictive `script-src`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, and explicit `connect-src`/`img-src` allowances for Supabase and the media domain. The external QR service should be removed or explicitly accounted for. Do not copy this sketch directly without observing the built app.

#### Remediation result

`vercel.json` now defines one enforced, site-wide policy:

```text
default-src 'self';
base-uri 'none';
object-src 'none';
frame-ancestors 'none';
form-action 'self';
script-src 'self';
script-src-attr 'none';
style-src 'self';
style-src-attr 'unsafe-inline';
font-src 'self';
img-src 'self' blob: https://media.jmumensrugbyclub.com https://pynvimffqpfhwttlbuao.supabase.co https://api.qrserver.com;
media-src 'self';
connect-src 'self' https://pynvimffqpfhwttlbuao.supabase.co https://media.jmumensrugbyclub.com https://73a769fc917d35b321261bed0b7bec8e.r2.cloudflarestorage.com;
frame-src https://www.instagram.com;
manifest-src 'self';
worker-src 'none';
upgrade-insecure-requests
```

The only `unsafe-inline` allowance is scoped to style attributes, which React and Framer Motion use for legitimate rendering and animation. It does not weaken `script-src`; executable JavaScript remains same-origin only, with inline and evaluated JavaScript disallowed.

The policy was first served locally as `Content-Security-Policy-Report-Only` against the production bundle. Every public route and `/admin` rendered without a CSP violation. It was then changed to the enforced header and re-verified. Three automated checks lock the exact dependency map, require the enforced header, prevent unsafe JavaScript sources, and preserve the anti-framing/base/form/object directives.

The Instagram and QR exceptions are narrowly scoped to their current functions. Remove the QR exception when S-12 replaces the third-party QR generator. Reassess the policy whenever a new analytics service, payment provider, embedded frame, external asset host, or browser worker is introduced.

### S-06 — Database changes are absent from migration history

**Severity:** Medium
**Status:** Remediated July 28, 2026

#### Evidence

At audit time, the live Supabase migration list was empty while the repository
contained numerous manually run SQL instruction files under `docs/`. The
intended `is_admin` script revoked anonymous execution, but the live function
remained executable by `anon`, demonstrating configuration drift.

#### Impact

- Production cannot be reproduced or reviewed reliably.
- Policy regressions are hard to detect.
- Rollbacks and officer/developer handoffs are risky.
- Documentation may describe a safer state than production actually has.

#### Implemented change

The live schema was converted to a reviewed, data-free baseline under
`supabase/migrations/`, ordered before S-01, and recorded as already applied in
production history. The repository now rebuilds and tests the migration chain,
including RLS and grants. The operations documentation requires reviewed
migrations, disposable rebuilds, production backups for destructive work,
forward-fix rollback planning, and post-change advisor checks. Historical SQL
snippets carry an explicit do-not-run warning.

### S-07 — Legacy public Supabase Storage bucket

**Severity:** Remediated (originally Medium)
**Status:** Remediated July 30, 2026

#### Evidence

At audit time, the `rugby-media` Supabase Storage bucket was public and had:

- No bucket file-size limit
- No bucket MIME allowlist
- A broad public `SELECT` policy that allows listing all objects
- Additional overlapping path-specific policies

The final retirement inventory found 13 objects rather than the five initially
counted. The difference consisted of older photos/headshots and empty-folder
markers. A production database and repository reference scan found only the two
sponsor paths still in use.

#### Remediation result

The two referenced sponsor logos were copied byte-for-byte to R2 and production
records were updated to relative R2 paths. All 13 legacy objects were then
downloaded into a verified backup archive before the Storage API emptied and
deleted the bucket. A reviewed migration removed all 12 obsolete Storage
policies, and the local bucket declaration was removed.

Production now has no `rugby-media` Supabase bucket, objects, or related
policies. The [public bucket listing lint](https://supabase.com/docs/guides/database/database-linter?lint=0025_public_bucket_allows_listing)
is absent from the post-change advisor report. Cloudflare R2 still contains the
two active sponsor objects, and live homepage, Media, and Team checks found no
Supabase Storage URL.

### S-08 — GitHub security hardening

**Severity:** Medium
**Status:** Remediated and verified August 24, 2026

#### Original evidence

- The repository is public.
- CI and nightly workflows use `actions/checkout@v4` and `actions/setup-node@v4` tags rather than immutable commit SHAs.
- Workflows do not declare explicit least-privilege `permissions`.
- No Dependabot configuration, CodeQL workflow, dependency-review workflow, or `SECURITY.md` was found.
- Branch protection/rulesets, secret scanning, push protection, administrator bypass, member 2FA, and required-review settings could not be verified with the available access.
- No high-confidence secret was found in the repository or history.

#### Remediation result

The CI and nightly workflows now use explicit read-only permissions and
immutable action SHAs. Dependabot, dependency review, CodeQL, a private
reporting policy, and regression tests were added. GitHub secret scanning, push
protection, dependency alerts and security updates, private vulnerability
reporting, and read-only workflow defaults are enabled.

The default branch is protected by a repository ruleset requiring a pull
request, successful `ci` and `dependency-review` checks, and resolution of
review conversations. Force pushes and deletion are blocked. The sole
repository administrator has pull-request-only emergency bypass. Zero approvals
are required because a one-maintainer repository cannot obtain an independent
approval; this should be increased when another regular maintainer is available.
Signed commits were intentionally not made mandatory. The owner confirmed GitHub
MFA is enabled.

### S-09 — Main site bypasses Cloudflare proxy; firewall rules need verification

**Severity:** Medium
**Status:** Architecture confirmed; rule details require dashboard verification

#### Evidence

For the primary domain:

- Apex and `www` DNS records are DNS-only and point to Vercel.
- `media.jmumensrugbyclub.com` is proxied through Cloudflare to R2.
- Cloudflare's zone WAF/rate-limiting rules therefore do not protect the main Vercel website.
- Vercel Authentication protects preview/immutable deployment URLs.
- Vercel Firewall configuration was not exposed by the connector.

This is not automatically a defect. A Vercel-hosted site can correctly use Vercel's protection. It means the ownership boundary must be explicit: Cloudflare protects media/DNS, while Vercel protects the public app.

Cloudflare R2 positives include disabled `r2.dev`, an enabled custom media domain with TLS 1.2 minimum, exact website origins in CORS, and multipart-upload cleanup after seven days.

#### Proposed change

1. Document which provider owns DDoS, WAF, bot, and rate-limit controls for each hostname.
2. Review Vercel Firewall in the dashboard and record active rules.
3. Review Cloudflare managed rules, custom rules, and rate-limit expressions for both zones.
4. Stage new rules in log-only mode, test on preview, then publish deliberately.
5. Narrow R2 CORS request headers from `*` if actual upload requirements allow it.
6. Evaluate caching for public R2 media; the tested image returned `cf-cache-status: DYNAMIC`.

Do not proxy Vercel through Cloudflare merely to clear this finding without testing Vercel domain verification, caching, redirects, TLS, and support implications.

### S-10 — Broad database grants and function execution

**Severity:** Medium
**Status:** Confirmed

#### Evidence

- Public tables grant broad privileges to `anon` and `authenticated`, including operations not required by the browser API. RLS still guards row-level operations, but least-privilege grants provide another layer.
- `public.is_admin()` is a `SECURITY DEFINER` function executable by `anon` and `authenticated`. Anonymous execution only returns false with the current function, but is unnecessary and differs from repository intent.
- `public.set_updated_at` has a mutable search path.
- `is_admin` sets `search_path=public`; security-definer functions should use a safe fixed path and qualified object names.

Supabase advisors reported the mutable search path and anonymous security-definer execution:

- [Mutable function search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Anonymous security-definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)

#### Proposed change

Include in the reviewed migration:

1. Revoke `is_admin` execution from `PUBLIC`/`anon`; grant only to `authenticated` if the client still needs it.
2. Use a fixed safe search path and schema-qualified names in security-definer functions.
3. Set a safe search path for trigger functions.
4. Reduce table/schema/function grants to the operations each role requires.
5. Re-run all administrator and public API tests after grant changes.

### S-11 — SPA fallback returns `200` for nonexistent sensitive paths

**Severity:** Low
**Status:** Confirmed

Requests to `/.env`, `/.git/config`, and `/wp-admin` returned the normal React application shell with HTTP `200`, not the requested file. No disclosure occurred. The catch-all Vercel rewrite causes scanners, search engines, and monitoring to treat nonexistent paths as valid.

**Proposed change:** Add explicit deny/404 handling for common sensitive paths and design a real SPA not-found strategy. Verify client-side routing and legacy redirects after any rewrite change.

### S-12 — Third-party QR generation leaks request metadata

**Severity:** Low
**Status:** Confirmed

The donation page embeds an image from `api.qrserver.com`, passing the donation URL in the query string. Visitors who load it disclose their IP address, user agent, referrer behavior, and the encoded destination to that third party.

**Proposed change:** Generate and host the QR image as a reviewed first-party asset, or disclose the provider and purpose in the privacy notice. Regenerate it whenever the approved donation destination changes.

### S-13 — Monitoring and incident-response ownership

**Severity:** Low
**Status:** No repository documentation found

No documented alert owner, security contact, credential-rotation schedule, incident checklist, or provider log-retention plan was found.

**Proposed change:** Create a lightweight runbook covering compromised admin accounts, exposed keys, malicious content changes, storage abuse, breach assessment, provider contacts, evidence retention, public communications, and officer transition. Enable appropriate Supabase, Vercel, Cloudflare, and GitHub notifications without collecting unnecessary visitor data.

### S-14 — Environment-variable onboarding and rotation inventory

**Severity:** Low
**Status:** Confirmed

`.env.local` is ignored and no tracked secret was found, which is correct. The repository has no `.env.example` describing required public variables, owners, or rotation procedures.

**Proposed change:** Add a value-free `.env.example` and a private credential inventory documenting where each secret lives, its privilege, owner, rotation trigger, and revocation steps. Never put actual values in the repository.

## Positive controls observed

- Static Vite/React production architecture with no custom Vercel server API
- No tracked or historical high-confidence secret found
- Supabase service-role and R2 secret values remain server-side in the Edge Function
- RLS enabled on every reviewed public table
- Public Auth signup disabled; email confirmation enabled
- Administrator authorization checked in the database/Edge Function rather than relying only on hidden UI
- R2 upload MIME allowlist, size limit, short signatures, and validated paths
- `r2.dev` disabled; media custom domain uses TLS 1.2 minimum
- Preview and immutable Vercel deployment URLs protected by Vercel Authentication
- HTTPS redirect, HSTS, clickjacking protection, MIME sniffing protection, restrictive referrer policy, and permissions policy
- No obvious HTML injection sink (`dangerouslySetInnerHTML`, `eval`, or `document.write`) found
- Lint passed
- All 10 automated tests passed
- Production build passed
- Git working tree was clean before documentation was added

## Proposed remediation sequence

No phase below is approved yet.

### Phase 0 — Safety baseline

- Export live Supabase schema, policies, functions, grants, Auth configuration, and storage object inventory.
- Record current Cloudflare, Vercel, GitHub, and DNS settings.
- Define rollback and maintenance window.
- Confirm the two administrator owners and emergency contacts.

### Phase 1 — Immediate access-control fixes

- Apply one reviewed migration for S-01, S-06, and S-10.
- Test anonymous, non-admin, admin `aal1`, and admin `aal2` behavior.
- Add/enroll/enforce MFA and enable leaked-password protection.
- Re-run Supabase security advisors.

### Phase 2 — Dependencies and Edge Function

- Upgrade dependencies in a branch.
- Pin Edge Function imports.
- Harden errors, signing authorization, and rate limits.
- Run the full public/admin/media test matrix.

### Phase 3 — Browser and repository defenses

- Stage CSP in report-only mode, then enforce.
- Correct sensitive-path/not-found responses.
- Harden GitHub workflows and enable repository security controls.

### Phase 4 — Provider controls and operations

- Verify Vercel and Cloudflare rules in their dashboards.
- Resolve or retire legacy Supabase Storage.
- Establish monitoring, incident response, access review, and credential rotation.

## Approval checklist

Before implementation, the site owner should explicitly approve:

- [ ] A maintenance window and backup/rollback plan
- [ ] The exact final RLS policy matrix
- [x] Application MFA decision — risk accepted under S-02 compensating controls
- [x] Dependency upgrade scope — S-03 implemented and deployed
- [x] Whether public download signing remains available — removed in S-04
- [x] Migrate production-referenced legacy Supabase assets to R2
- [x] Permanently delete the Supabase rollback copies, bucket, and obsolete policies
- [x] CSP rollout in report-only then enforcement stages
- [x] GitHub branch/ruleset requirements
- [ ] Vercel/Cloudflare firewall ownership and proposed rules
- [ ] Monitoring owner, security contact, and incident process

## Current verification record

- `npm run lint` — passed
- `npm run test:ci` — passed, 20 tests
- `npm audit --omit=dev --audit-level=high` — passed, zero vulnerabilities
- `npm run build` — passed
- Build emitted a performance warning for a JavaScript chunk over 500 kB; this is a performance/maintainability issue, not a direct security finding.

## Decision

**S-01, S-04, S-05, S-06, S-07, and S-08 were implemented, and S-02 was accepted with compensating controls.** S-06 establishes an ordered, data-free Supabase baseline and records it in production history without replaying it over the existing schema. S-08 establishes automated GitHub supply-chain checks and default-branch protections appropriate for the current one-maintainer repository. Every remaining finding requires separate owner discussion/approval. These decisions do not authorize modifying DNS/firewalls, changing other provider settings, or deploying additional code.
