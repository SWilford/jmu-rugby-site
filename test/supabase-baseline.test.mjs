import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const migrationsDirectory = path.join(projectRoot, 'supabase', 'migrations')
const baselineFilename = '20260728000000_baseline_live_schema.sql'
const remediationFilename =
  '20260728232351_fix_permissive_content_policies.sql'
const sponsorMigrationFilename =
  '20260731014725_migrate_sponsor_logos_to_r2.sql'
const storageRetirementFilename =
  '20260731020959_retire_legacy_supabase_storage.sql'
const databaseHardeningFilename =
  '20260825131753_harden_database_privileges.sql'
const defaultPrivilegeHardeningFilename =
  '20260825131944_lock_down_default_privileges.sql'

const expectedTables = [
  'admins',
  'coaches',
  'contact_cards',
  'donate_content_settings',
  'join_content_faq',
  'join_content_schedule',
  'join_content_settings',
  'matches',
  'media',
  'roster',
  'sponsors',
]

const expectedColumns = {
  admins: ['user_id', 'created_at'],
  coaches: ['id', 'name', 'position', 'bio', 'headshot_url'],
  contact_cards: [
    'id',
    'label',
    'value',
    'contact_type',
    'cta_label',
    'display_order',
    'is_active',
    'created_at',
    'updated_at',
  ],
  donate_content_settings: [
    'id',
    'key',
    'value',
    'description',
    'created_at',
    'updated_at',
  ],
  join_content_faq: [
    'id',
    'question',
    'answer',
    'display_order',
    'is_active',
    'updated_at',
  ],
  join_content_schedule: [
    'id',
    'label',
    'detail',
    'display_order',
    'updated_at',
  ],
  join_content_settings: [
    'id',
    'key',
    'value',
    'description',
    'updated_at',
  ],
  matches: [
    'id',
    'season_id',
    'season_name',
    'date',
    'opponent',
    'side',
    'home',
    'result',
    'show_result',
    'notes',
  ],
  media: [
    'id',
    'album',
    'file_path',
    'featured',
    'upload_date',
    'season_id',
    'home_carousel',
    'join_page',
  ],
  roster: [
    'id',
    'name',
    'position',
    'year',
    'major',
    'hometown',
    'height',
    'weight',
    'bio',
    'headshot_url',
  ],
  sponsors: [
    'id',
    'name',
    'website_url',
    'logo_url',
    'logo_object_path',
    'alt_text',
    'display_order',
    'is_active',
    'updated_at',
  ],
}

async function readMigration(filename) {
  return readFile(path.join(migrationsDirectory, filename), 'utf8')
}

async function listMigrationFiles() {
  return (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith('.sql'))
    .sort()
}

test('the data-free baseline precedes every remediation migration', async () => {
  const migrationFiles = await listMigrationFiles()

  assert.equal(migrationFiles[0], baselineFilename)
  assert.equal(migrationFiles[1], remediationFilename)
  assert.equal(migrationFiles[2], sponsorMigrationFilename)
  assert.equal(migrationFiles[3], storageRetirementFilename)
  assert.equal(migrationFiles[4], databaseHardeningFilename)
  assert.equal(migrationFiles[5], defaultPrivilegeHardeningFilename)

  const baseline = await readMigration(baselineFilename)
  const databaseHardening = await readMigration(databaseHardeningFilename)
  const defaultPrivilegeHardening = await readMigration(
    defaultPrivilegeHardeningFilename,
  )

  assert.doesNotMatch(baseline, /\binsert\s+into\s+(?:public|auth)\./i)
  assert.doesNotMatch(baseline, /\bcopy\s+(?:public|auth)\./i)
  assert.doesNotMatch(
    baseline,
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  )

  for (const table of expectedTables) {
    assert.match(baseline, new RegExp(`create table public\\.${table}\\b`, 'i'))
    assert.match(
      baseline,
      new RegExp(
        `alter table public\\.${table} enable row level security\\b`,
        'i',
      ),
    )
  }

  assert.match(
    databaseHardening,
    /alter default privileges for role postgres in schema public\s+revoke execute on functions\s+from public, anon, authenticated, service_role;/i,
  )
  assert.match(
    defaultPrivilegeHardening,
    /alter default privileges for role postgres in schema public\s+revoke all privileges on tables\s+from public, anon, authenticated, service_role;/i,
  )
  assert.match(
    defaultPrivilegeHardening,
    /alter default privileges for role postgres in schema public\s+revoke all privileges on sequences\s+from public, anon, authenticated, service_role;/i,
  )
  assert.match(
    defaultPrivilegeHardening,
    /alter default privileges for role postgres in schema public\s+revoke all privileges on functions\s+from public, anon, authenticated, service_role;/i,
  )
})

test('the complete migration chain rebuilds an empty Supabase-shaped database', async () => {
  const database = new PGlite()

  try {
    await database.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin;

      create schema auth;
      create table auth.users (
        id uuid primary key
      );
      create function auth.uid()
      returns uuid
      language sql
      stable
      as $$ select null::uuid $$;

      create schema storage;
      create table storage.buckets (
        id text primary key,
        name text not null,
        public boolean not null default false,
        file_size_limit bigint,
        allowed_mime_types text[]
      );
      create table storage.objects (
        id uuid primary key default gen_random_uuid(),
        bucket_id text,
        name text
      );
      alter table storage.objects enable row level security;
    `)

    for (const filename of await listMigrationFiles()) {
      await database.exec(await readMigration(filename))
    }

    const tableResult = await database.query(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
      order by table_name
    `)
    assert.deepEqual(
      tableResult.rows.map(({ table_name: tableName }) => tableName),
      expectedTables,
    )

    const rlsResult = await database.query(`
      select relname
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where pg_namespace.nspname = 'public'
        and pg_class.relkind = 'r'
        and pg_class.relrowsecurity = true
      order by relname
    `)
    assert.deepEqual(
      rlsResult.rows.map(({ relname }) => relname),
      expectedTables,
    )

    for (const table of expectedTables) {
      const columnResult = await database.query(
        `
          select column_name
          from information_schema.columns
          where table_schema = 'public'
            and table_name = $1
          order by ordinal_position
        `,
        [table],
      )
      assert.deepEqual(
        columnResult.rows.map(({ column_name: columnName }) => columnName),
        expectedColumns[table],
      )

      const rowResult = await database.query(
        `select count(*)::integer as count from public.${table}`,
      )
      assert.equal(rowResult.rows[0].count, 0)
    }

    const policyResult = await database.query(`
      select schemaname, count(*)::integer as count
      from pg_policies
      where schemaname in ('public', 'storage')
      group by schemaname
      order by schemaname
    `)
    assert.deepEqual(policyResult.rows, [
      { schemaname: 'public', count: 57 },
    ])

    const triggerResult = await database.query(`
      select count(*)::integer as count
      from information_schema.triggers
      where trigger_schema = 'public'
    `)
    assert.equal(triggerResult.rows[0].count, 6)

    const anonymousReadGrantResult = await database.query(`
      select bool_and(
        has_table_privilege(
          'anon',
          format('public.%I', table_name),
          'SELECT'
        )
      ) as all_granted
      from unnest(array[
        'coaches',
        'contact_cards',
        'donate_content_settings',
        'join_content_faq',
        'join_content_schedule',
        'join_content_settings',
        'matches',
        'media',
        'roster',
        'sponsors'
      ]) table_name
    `)
    assert.equal(anonymousReadGrantResult.rows[0].all_granted, true)

    const anonymousDeniedGrantResult = await database.query(`
      select bool_and(
        not has_table_privilege(
          'anon',
          format('public.%I', table_name),
          privilege_name
        )
      ) as all_denied
      from unnest(array[
        'admins',
        'coaches',
        'contact_cards',
        'donate_content_settings',
        'join_content_faq',
        'join_content_schedule',
        'join_content_settings',
        'matches',
        'media',
        'roster',
        'sponsors'
      ]) table_name
      cross join unnest(array[
        'INSERT',
        'UPDATE',
        'DELETE',
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER'
      ]) privilege_name
    `)
    assert.equal(anonymousDeniedGrantResult.rows[0].all_denied, true)

    const anonymousAdminsReadResult = await database.query(`
      select has_table_privilege(
        'anon',
        'public.admins',
        'SELECT'
      ) as is_granted
    `)
    assert.equal(anonymousAdminsReadResult.rows[0].is_granted, false)

    const applicationDmlGrantResult = await database.query(`
      select bool_and(
        has_table_privilege(
          role_name,
          format('public.%I', table_name),
          privilege_name
        )
      ) as all_granted
      from unnest(array['authenticated', 'service_role']) role_name
      cross join unnest(array[
        'admins',
        'coaches',
        'contact_cards',
        'donate_content_settings',
        'join_content_faq',
        'join_content_schedule',
        'join_content_settings',
        'matches',
        'media',
        'roster',
        'sponsors'
      ]) table_name
      cross join unnest(array[
        'SELECT',
        'INSERT',
        'UPDATE',
        'DELETE'
      ]) privilege_name
    `)
    assert.equal(applicationDmlGrantResult.rows[0].all_granted, true)

    const elevatedTableGrantResult = await database.query(`
      select bool_and(
        not has_table_privilege(
          role_name,
          format('public.%I', table_name),
          privilege_name
        )
      ) as all_denied
      from unnest(array['anon', 'authenticated', 'service_role']) role_name
      cross join unnest(array[
        'admins',
        'coaches',
        'contact_cards',
        'donate_content_settings',
        'join_content_faq',
        'join_content_schedule',
        'join_content_settings',
        'matches',
        'media',
        'roster',
        'sponsors'
      ]) table_name
      cross join unnest(array[
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER'
      ]) privilege_name
    `)
    assert.equal(elevatedTableGrantResult.rows[0].all_denied, true)

    const sequenceUsageGrantResult = await database.query(`
      select bool_and(
        has_sequence_privilege(
          role_name,
          format('public.%I', sequence_name),
          'USAGE'
        )
      ) as all_granted
      from unnest(array['authenticated', 'service_role']) role_name
      cross join unnest(array[
        'contact_cards_id_seq',
        'donate_content_settings_id_seq',
        'media_id_seq'
      ]) sequence_name
    `)
    assert.equal(sequenceUsageGrantResult.rows[0].all_granted, true)

    const sequenceDeniedGrantResult = await database.query(`
      select bool_and(
        not has_sequence_privilege(
          role_name,
          format('public.%I', sequence_name),
          privilege_name
        )
      ) as all_denied
      from unnest(array['anon', 'authenticated', 'service_role']) role_name
      cross join unnest(array[
        'contact_cards_id_seq',
        'donate_content_settings_id_seq',
        'media_id_seq'
      ]) sequence_name
      cross join unnest(array['SELECT', 'UPDATE']) privilege_name
    `)
    assert.equal(sequenceDeniedGrantResult.rows[0].all_denied, true)

    const anonymousSequenceUsageResult = await database.query(`
      select bool_and(
        not has_sequence_privilege(
          'anon',
          format('public.%I', sequence_name),
          'USAGE'
        )
      ) as all_denied
      from unnest(array[
        'contact_cards_id_seq',
        'donate_content_settings_id_seq',
        'media_id_seq'
      ]) sequence_name
    `)
    assert.equal(anonymousSequenceUsageResult.rows[0].all_denied, true)

    const functionGrantResult = await database.query(`
      select
        has_function_privilege(
          'anon',
          'public.is_admin()',
          'EXECUTE'
        ) as anon_is_admin,
        has_function_privilege(
          'authenticated',
          'public.is_admin()',
          'EXECUTE'
        ) as authenticated_is_admin,
        has_function_privilege(
          'service_role',
          'public.is_admin()',
          'EXECUTE'
        ) as service_role_is_admin,
        has_function_privilege(
          'anon',
          'public.set_updated_at()',
          'EXECUTE'
        ) as anon_set_updated_at,
        has_function_privilege(
          'authenticated',
          'public.set_updated_at()',
          'EXECUTE'
        ) as authenticated_set_updated_at,
        has_function_privilege(
          'service_role',
          'public.set_updated_at()',
          'EXECUTE'
        ) as service_role_set_updated_at
    `)
    assert.deepEqual(functionGrantResult.rows, [
      {
        anon_is_admin: false,
        authenticated_is_admin: true,
        service_role_is_admin: true,
        anon_set_updated_at: false,
        authenticated_set_updated_at: false,
        service_role_set_updated_at: false,
      },
    ])

    const functionHardeningResult = await database.query(`
      select
        proname,
        prosecdef as security_definer,
        proconfig @> array['search_path=""'] as has_empty_search_path
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
      where pg_namespace.nspname = 'public'
        and proname in ('is_admin', 'set_updated_at')
      order by proname
    `)
    assert.deepEqual(functionHardeningResult.rows, [
      {
        proname: 'is_admin',
        security_definer: true,
        has_empty_search_path: true,
      },
      {
        proname: 'set_updated_at',
        security_definer: false,
        has_empty_search_path: true,
      },
    ])

    await database.exec(`
      create table public.future_content (id bigint primary key);
      create sequence public.future_content_id_seq;
    `)

    const futureDefaultGrantResult = await database.query(`
      select
        has_table_privilege('anon', 'public.future_content', 'SELECT')
          as anon_table,
        has_table_privilege(
          'authenticated',
          'public.future_content',
          'SELECT'
        ) as authenticated_table,
        has_sequence_privilege(
          'anon',
          'public.future_content_id_seq',
          'USAGE'
        ) as anon_sequence,
        has_sequence_privilege(
          'authenticated',
          'public.future_content_id_seq',
          'USAGE'
        ) as authenticated_sequence
    `)
    assert.deepEqual(futureDefaultGrantResult.rows, [
      {
        anon_table: false,
        authenticated_table: false,
        anon_sequence: false,
        authenticated_sequence: false,
      },
    ])

    const adminId = 'd583b2c4-c5d6-47e8-91f0-123456789abc'
    await database.exec(`
      create or replace function auth.uid()
      returns uuid
      language sql
      stable
      as $$ select '${adminId}'::uuid $$;

      insert into auth.users (id) values ('${adminId}');
      insert into public.admins (user_id) values ('${adminId}');
      insert into public.contact_cards (
        label,
        value,
        updated_at
      ) values (
        'Security test',
        'before',
        '2000-01-01 00:00:00+00'
      );

      set role authenticated;
      update public.contact_cards
      set value = 'after'
      where label = 'Security test';
      reset role;
    `)

    const triggerBehaviorResult = await database.query(`
      select value, updated_at > '2000-01-01 00:00:00+00' as timestamp_changed
      from public.contact_cards
      where label = 'Security test'
    `)
    assert.deepEqual(triggerBehaviorResult.rows, [
      { value: 'after', timestamp_changed: true },
    ])

    await database.exec(`
      insert into public.contact_cards (
        label,
        value,
        is_active
      ) values
        ('Anonymous active test', 'visible', true),
        ('Anonymous inactive test', 'hidden', false);
      set role anon;
    `)

    try {
      const anonymousPolicyResult = await database.query(`
        select label
        from public.contact_cards
        where label like 'Anonymous % test'
        order by label
      `)
      assert.deepEqual(anonymousPolicyResult.rows, [
        { label: 'Anonymous active test' },
      ])
    } finally {
      await database.exec('reset role;')
    }

    const bucketResult = await database.query(`
      select id, name, public, file_size_limit, allowed_mime_types
      from storage.buckets
      where id = 'rugby-media'
    `)
    assert.deepEqual(bucketResult.rows, [])

    const storageObjectResult = await database.query(`
      select count(*)::integer as count
      from storage.objects
    `)
    assert.equal(storageObjectResult.rows[0].count, 0)
  } finally {
    await database.close()
  }
})
