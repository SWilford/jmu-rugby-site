-- ============================================================
-- Secure roster/coaches editing so only admins can insert/update/delete
-- while everyone can continue reading roster and coach data.
--
-- Also adds storage policies for headshots in:
--   rugby-media/headshots/*
--
-- Prerequisite:
-- - public.is_admin() exists and is SECURITY DEFINER.
--   If needed, run docs/supabase_admin_auth_fix.sql first.
--
-- Safe to run multiple times.
-- ============================================================

-- Roster table policies
alter table public.roster enable row level security;

drop policy if exists "Public read roster" on public.roster;
create policy "Public read roster"
on public.roster
for select
to anon, authenticated
using (true);

drop policy if exists "Admins insert roster" on public.roster;
create policy "Admins insert roster"
on public.roster
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins update roster" on public.roster;
create policy "Admins update roster"
on public.roster
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete roster" on public.roster;
create policy "Admins delete roster"
on public.roster
for delete
to authenticated
using (public.is_admin());

-- Coaches table policies
alter table public.coaches enable row level security;

drop policy if exists "Public read coaches" on public.coaches;
create policy "Public read coaches"
on public.coaches
for select
to anon, authenticated
using (true);

drop policy if exists "Admins insert coaches" on public.coaches;
create policy "Admins insert coaches"
on public.coaches
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins update coaches" on public.coaches;
create policy "Admins update coaches"
on public.coaches
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete coaches" on public.coaches;
create policy "Admins delete coaches"
on public.coaches
for delete
to authenticated
using (public.is_admin());

-- Storage object policies for rugby-media/headshots/*
-- Note: On Supabase, storage.objects is managed by Storage and already has RLS.

drop policy if exists "Public read rugby-media headshots objects" on storage.objects;
create policy "Public read rugby-media headshots objects"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'rugby-media'
  and name like 'headshots/%'
);

drop policy if exists "Admins insert rugby-media headshots objects" on storage.objects;
create policy "Admins insert rugby-media headshots objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'rugby-media'
  and name like 'headshots/%'
  and public.is_admin()
);

drop policy if exists "Admins update rugby-media headshots objects" on storage.objects;
create policy "Admins update rugby-media headshots objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'rugby-media'
  and name like 'headshots/%'
  and public.is_admin()
)
with check (
  bucket_id = 'rugby-media'
  and name like 'headshots/%'
  and public.is_admin()
);

drop policy if exists "Admins delete rugby-media headshots objects" on storage.objects;
create policy "Admins delete rugby-media headshots objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'rugby-media'
  and name like 'headshots/%'
  and public.is_admin()
);
