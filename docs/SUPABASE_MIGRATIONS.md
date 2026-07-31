# Supabase Migration Runbook

The ordered SQL files in `supabase/migrations/` are the only source of truth for
the database schema. SQL files named `docs/supabase_*.sql` are historical
implementation notes and must not be run.

## Current migration chain

1. `20260728000000_baseline_live_schema.sql` recreates the schema that existed
   when migration tracking was introduced. It includes no website content,
   administrator IDs, Auth users, or Storage objects.
2. `20260728232351_fix_permissive_content_policies.sql` applies the S-01 policy
   remediation.
3. `20260731014725_migrate_sponsor_logos_to_r2.sql` moves the final production
   sponsor references from Supabase Storage to Cloudflare R2 paths.
4. `20260731020959_retire_legacy_supabase_storage.sql` removes the obsolete
   Supabase Storage policies and the empty legacy bucket from clean rebuilds.

The baseline is recorded as applied in the production migration history. It was
not executed against the existing production schema.

## Creating a migration

1. Create the file with `npx supabase migration new descriptive_name`.
2. Make the migration narrowly scoped and review its SQL.
3. Add or update automated policy/grant tests.
4. Run `npm run test:ci`, `npm run lint`, and `npm run build`.
5. Rebuild a disposable database with `npx supabase db reset` when Docker is
   available. The repository test suite also executes the full migration chain
   in an in-process disposable PostgreSQL database.
6. Take or confirm an appropriate production backup before a destructive or
   data-transforming migration.
7. Apply the migration once through the Supabase migration workflow, verify the
   application, and re-run the Supabase security and performance advisors.

Do not run schema snippets directly in the SQL editor and then leave the
migration history behind. Never use `supabase db reset --linked` against
production.

## Rollback approach

Prefer a reviewed forward-fix migration. For destructive changes, document
restoration steps and verify a backup before applying the migration. Migration
history repair is only for reconciling history with a schema already known to be
in the matching state; it must not be used to disguise an unapplied schema
change.
