# Security Operations and Incident Response

## Ownership

The current Marketing Chairs jointly own day-to-day website security and administrator access. Both chairs should receive provider security and deployment notifications and should be able to reach the club's password manager without relying on a personal device belonging to one person.

The Club President, or another executive officer designated in the private credential inventory, is the escalation contact when both Marketing Chairs are unavailable. That officer does not need routine administrator access unless they actively maintain the site.

Never publish personal phone numbers, recovery codes, credential values, or the completed private inventory in this repository.

## Routine review schedule

### After every production change

- Confirm the Vercel production deployment is `Ready` and the canonical domain loads over HTTPS.
- Check the changed public and administrator flows for browser console errors.
- Review Supabase Edge Function and database logs for unexpected authorization or server errors.
- Review Vercel and Cloudflare security events when the change affects routing, storage, uploads, or firewall rules.
- Record the pull request, deployment, verification, and any rollback in the officer handoff notes.

### Monthly

- Review the administrator list in `/admin` and remove anyone who no longer holds an authorized role.
- Review GitHub Dependabot, code-scanning, secret-scanning, and failed Actions notifications.
- Review Supabase Security Advisor findings, Auth activity, and Edge Function errors.
- Review Vercel deployment failures, runtime errors, firewall activity, and domain status.
- Review Cloudflare Security Events, DNS changes, R2 request trends, and unexpected storage growth.
- Confirm the domain registrar account, billing methods, and renewal notices remain current.

### At each officer transition

1. An outgoing Marketing Chair invites the incoming Marketing Chair from **Admin Portal → Administrator access**.
2. The incoming chair accepts the email invite, sets a unique password of at least 16 characters, signs out, and verifies a fresh sign-in.
3. The incoming chair confirms access to GitHub, Supabase, Vercel, Cloudflare, the domain registrar, and the club password manager. Control-panel MFA remains required.
4. Rotate any credential that was shared directly or stored outside the approved password manager.
5. Remove the outgoing chair from `/admin` and each provider unless they remain an authorized maintainer.
6. Transfer recovery codes and update the private credential inventory without placing values in GitHub.

The admin editor intentionally blocks self-removal and removal of the final administrator. Add and verify the successor first, then let a different current administrator remove the outgoing chair.

## Notification routing

Use provider-native notifications and existing privacy-minimal logs. Do not add visitor session recording, fingerprinting, or additional analytics solely for security monitoring.

| Provider | Marketing Chairs should monitor | Escalate immediately when |
| --- | --- | --- |
| GitHub | Dependabot, secret/code scanning, failed protected-branch checks, new collaborators, ruleset changes | A secret is detected, `main` protection changes, or an unknown commit/deployment appears |
| Supabase | Security Advisor, Auth/admin activity, database and Edge Function errors, unusual request volume | An unknown admin appears, RLS fails, a privileged key may be exposed, or repeated unauthorized function calls occur |
| Vercel | Failed deployments, unexpected production deployments, runtime errors, firewall events, domain/certificate status | Production changes without approval, sensitive paths begin returning content, or traffic is actively blocked/attacked |
| Cloudflare | DNS changes, Security Events, R2 usage/errors, API-token activity, billing alerts | DNS or custom domains change unexpectedly, R2 writes spike, or an R2 token may be exposed |
| Domain registrar | Login alerts, contact changes, transfer/renewal notices | Nameservers, ownership, transfer lock, or recovery details change unexpectedly |

## Incident response

### First 15 minutes

1. One Marketing Chair becomes incident lead and opens a private timeline. Record UTC times, affected accounts, visible symptoms, and provider event/request IDs. Never paste credentials into the timeline.
2. Preserve evidence before changing it: screenshots, relevant provider log exports, commit/deployment IDs, and suspicious object paths.
3. Contain the smallest affected boundary. Examples: remove a website administrator, revoke a provider session/token, pause a compromised deployment, or temporarily block a malicious source.
4. Notify the second Marketing Chair and the designated executive escalation contact.

### Compromised website administrator

- Remove the person from **Admin Portal → Administrator access** using a different administrator account.
- Revoke their Supabase Auth sessions or disable/delete the Auth user in the Supabase Dashboard when immediate token invalidation is required. Removing the `public.admins` row blocks database/Edge authorization, but deleting a user alone does not invalidate every already-issued token.
- Reset the affected email account and verify its MFA before restoring access.
- Review content-table changes, R2 writes/deletes, and Auth/Edge Function logs from the suspected start time.

### Exposed key or provider credential

- Revoke or rotate the credential at its source first; do not merely delete it from a file or Git history.
- Search GitHub history, Actions output, Vercel configuration, Supabase function secrets/logs, Cloudflare configuration, local machines, and shared messages for copies.
- Redeploy or restart only the consumers listed in `ENVIRONMENT_AND_CREDENTIALS.md`.
- Verify the old credential fails and the replacement succeeds.
- If a secret reached GitHub, use private GitHub security reporting and follow GitHub's history-removal guidance after revocation.

### Malicious content, storage abuse, or destructive change

- Remove the responsible administrator and revoke affected sessions.
- Preserve current database/R2 state and relevant logs before cleanup when practical.
- Restore approved content from the database backup, Git history, or reviewed media source.
- Review Cloudflare R2 operations and Supabase table changes for the complete affected window.
- Confirm upload type/size controls, RLS, Edge Function authorization, and firewall rules still behave as documented.

### Public disclosure or personal-data incident

- Stop the disclosure and preserve evidence.
- Identify what data was affected, whose data it was, the likely access window, and whether it was actually acquired.
- Contact JMU University Recreation/club leadership and appropriate university privacy or legal staff promptly. They decide regulatory, contractual, insurer, law-enforcement, and individual notification obligations.
- Do not make public breach claims or promises before the facts and university response path are confirmed.

## Recovery and closure

- Verify public pages, administrator login, database writes, R2 upload/delete, real 404s, redirects, CSP, and provider access after containment.
- Document root cause, affected scope, rotated credentials, restored data, and preventative changes.
- Retain incident-only evidence in the club's approved private storage for the period directed by JMU or legal counsel. Do not create a permanent visitor-data archive for routine monitoring.
- Close the incident only after both Marketing Chairs agree that containment and verification are complete.
