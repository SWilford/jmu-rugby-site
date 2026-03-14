-- ============================================================
-- Sponsors schema + RLS + storage policies
-- Public can read active sponsors.
-- Only admins can insert/update/delete sponsors.
--
-- Also adds storage policies for sponsor logos in:
--   rugby-media/sponsors/*
--
-- Prerequisite:
-- - public.is_admin() exists and is SECURITY DEFINER.
--   If needed, run docs/supabase_admin_auth_fix.sql first.
--
-- Safe to run multiple times.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website_url text,
  logo_url text,
  alt_text text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists sponsors_order_idx
  on public.sponsors (display_order, id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sponsors_updated_at on public.sponsors;
create trigger trg_sponsors_updated_at
before update on public.sponsors
for each row
execute function public.set_updated_at();

alter table public.sponsors enable row level security;

drop policy if exists "Public read active sponsors" on public.sponsors;
create policy "Public read active sponsors"
on public.sponsors
for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "Admins insert sponsors" on public.sponsors;
create policy "Admins insert sponsors"
on public.sponsors
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins update sponsors" on public.sponsors;
create policy "Admins update sponsors"
on public.sponsors
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete sponsors" on public.sponsors;
create policy "Admins delete sponsors"
on public.sponsors
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Public read rugby-media sponsors objects" on storage.objects;
create policy "Public read rugby-media sponsors objects"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'rugby-media'
  and name like 'sponsors/%'
);

drop policy if exists "Admins insert rugby-media sponsors objects" on storage.objects;
create policy "Admins insert rugby-media sponsors objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'rugby-media'
  and name like 'sponsors/%'
  and public.is_admin()
);

drop policy if exists "Admins update rugby-media sponsors objects" on storage.objects;
create policy "Admins update rugby-media sponsors objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'rugby-media'
  and name like 'sponsors/%'
  and public.is_admin()
)
with check (
  bucket_id = 'rugby-media'
  and name like 'sponsors/%'
  and public.is_admin()
);

drop policy if exists "Admins delete rugby-media sponsors objects" on storage.objects;
create policy "Admins delete rugby-media sponsors objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'rugby-media'
  and name like 'sponsors/%'
  and public.is_admin()
);
