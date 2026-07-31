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

  const baseline = await readMigration(baselineFilename)

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
      { schemaname: 'public', count: 54 },
    ])

    const triggerResult = await database.query(`
      select count(*)::integer as count
      from information_schema.triggers
      where trigger_schema = 'public'
    `)
    assert.equal(triggerResult.rows[0].count, 6)

    const tableGrantResult = await database.query(`
      select bool_and(
        has_table_privilege(
          role_name,
          format('public.%I', table_name),
          privilege_name
        )
      ) as all_granted
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
        'SELECT',
        'INSERT',
        'UPDATE',
        'DELETE',
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER'
      ]) privilege_name
    `)
    assert.equal(tableGrantResult.rows[0].all_granted, true)

    const sequenceGrantResult = await database.query(`
      select bool_and(
        has_sequence_privilege(
          role_name,
          format('public.%I', sequence_name),
          privilege_name
        )
      ) as all_granted
      from unnest(array['anon', 'authenticated', 'service_role']) role_name
      cross join unnest(array[
        'contact_cards_id_seq',
        'donate_content_settings_id_seq',
        'media_id_seq'
      ]) sequence_name
      cross join unnest(array['USAGE', 'SELECT', 'UPDATE']) privilege_name
    `)
    assert.equal(sequenceGrantResult.rows[0].all_granted, true)

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
