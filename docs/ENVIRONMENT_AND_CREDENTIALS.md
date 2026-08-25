# Environment and Credential Inventory

This file documents names, locations, owners, and rotation procedures without containing credential values. The Marketing Chairs maintain a completed private copy in the club's approved password manager. Never commit actual secrets, passwords, recovery codes, database URLs, or API-token values.

## Application variables

| Variable | Sensitivity | Stored in / used by | Owner | Rotation or verification action |
| --- | --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Public identifier | Vercel; browser build | Marketing Chairs | Verify after Supabase project/domain changes; no secret rotation |
| `VITE_SUPABASE_ANON_KEY` | Public low-privilege key | Vercel; browser build | Marketing Chairs | Prefer Supabase publishable keys; replace and redeploy when migrating/revoking the old key |
| `VITE_R2_PUBLIC_BASE_URL` | Public URL | Vercel; browser build | Marketing Chairs | Verify after Cloudflare custom-domain changes |
| `VITE_MAX_R2_UPLOAD_BYTES` | Public configuration | Vercel; browser build | Marketing Chairs | Keep synchronized with the server value; current approved limit is `12582912` (12 MiB) |
| `SUPABASE_URL` | Provider-managed endpoint | Supabase Edge Functions | Supabase | Provider supplies automatically; verify after project migration |
| `SUPABASE_PUBLISHABLE_KEYS` / `SUPABASE_ANON_KEY` | Public/legacy function key | Supabase Edge Functions | Supabase / Marketing Chairs | Provider supplies automatically; migrate off legacy keys before provider retirement |
| `SUPABASE_SECRET_KEYS` / `SUPABASE_SERVICE_ROLE_KEY` | Critical server credential | `admin-users` Edge Function | Marketing Chairs | Never expose to browser; revoke/rotate immediately after suspected exposure; migrate off legacy service-role key before retirement |
| `ADMIN_INVITE_REDIRECT_URL` | Public configuration | `admin-users` Edge Function | Marketing Chairs | Canonical value: `https://www.jmumensrugbyclub.com/admin`; keep in Supabase Auth redirect allow-list |
| `R2_ACCOUNT_ID` | Sensitive identifier | `r2-media` Edge Function | Marketing Chairs | Verify against Cloudflare account during handoff |
| `R2_BUCKET` | Sensitive resource name | `r2-media` Edge Function | Marketing Chairs | Current bucket: `rugby-media`; update only with a reviewed migration |
| `R2_ACCESS_KEY_ID` | Secret credential component | `r2-media` Edge Function | Marketing Chairs | Rotate with its matching secret after exposure, officer transition if shared, or material scope change |
| `R2_SECRET_ACCESS_KEY` | Critical server credential | `r2-media` Edge Function | Marketing Chairs | Rotate with access-key ID; verify old token revoked and upload/delete still work |
| `R2_PUBLIC_BASE_URL` | Public URL | `r2-media` Edge Function | Marketing Chairs | Keep synchronized with frontend custom domain |
| `R2_MAX_UPLOAD_BYTES` | Server control | `r2-media` Edge Function | Marketing Chairs | Current approved limit: `12582912`; keep synchronized with frontend display limit |
| `CORS_ORIGINS` | Security configuration | Supabase Edge Functions | Marketing Chairs | Review whenever canonical, preview, or local origins change; do not add wildcards |

## Provider-account inventory template

Keep the completed version private. Use provider roles or individual accounts; do not share one personal login.

| Provider/resource | Current owner(s) | Backup owner | MFA/recovery location | Billing/renewal owner | Last access review | Next review |
| --- | --- | --- | --- | --- | --- | --- |
| GitHub repository and organization | Marketing Chairs | Designated executive officer | Private password manager | Club officer | _private_ | _private_ |
| Supabase organization/project | Marketing Chairs | Designated executive officer | Private password manager | Club officer | _private_ | _private_ |
| Vercel team/project | Marketing Chairs | Designated executive officer | Private password manager | Club officer | _private_ | _private_ |
| Cloudflare account/zone/R2 | Marketing Chairs | Designated executive officer | Private password manager | Club officer | _private_ | _private_ |
| Domain registrar | Marketing Chairs | Designated executive officer | Private password manager | Treasurer or designated officer | _private_ | _private_ |
| Club email/recovery accounts | Named individual owners | Designated executive officer | Private password manager | Club officer | _private_ | _private_ |

## Rotation triggers

Rotate or revoke immediately when a credential is exposed, appears in source control/logs/messages, is used from an unknown device/location, belongs to a departing officer, has broader scope than needed, or is implicated in suspicious content/storage activity.

For routine handoffs, review every provider membership and token. Rotate only credentials the outgoing officer could copy or that were shared; individual provider accounts can usually be removed without rotating unrelated project credentials.

## Safe rotation procedure

1. Identify every consumer from the table above.
2. Create a replacement with the minimum required scope and store it in the private password manager.
3. Update the provider-hosted environment or function secret; never write the value to a repository file.
4. Deploy/restart the affected consumer if required.
5. Test the complete operation with the new credential.
6. Revoke the old credential and verify it fails.
7. Record the date, operator, resource, and verification result in the private inventory—never the value.
