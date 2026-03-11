-- ============================================================
-- Secure media editing so only admins can insert/update/delete
-- while everyone can read media and media assets.
--
-- Prerequisites:
-- - public.is_admin() exists and is SECURITY DEFINER.
--   If needed, run docs/supabase_admin_auth_fix.sql first.
-- - Bucket `rugby-media` exists.
--
-- Safe to run multiple times.
-- ============================================================

-- Media table policies
alter table public.media enable row level security;

drop policy if exists "Public read media" on public.media;
create policy "Public read media"
on public.media
for select
to anon, authenticated
using (true);

drop policy if exists "Admins insert media" on public.media;
create policy "Admins insert media"
on public.media
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins update media" on public.media;
create policy "Admins update media"
on public.media
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete media" on public.media;
create policy "Admins delete media"
on public.media
for delete
to authenticated
using (public.is_admin());

-- Storage object policies for `rugby-media` bucket
-- Note: Do not run `alter table storage.objects ...` here.
-- On Supabase, `storage.objects` is managed by the Storage service and
-- is already protected with RLS.

drop policy if exists "Public read rugby-media objects" on storage.objects;
create policy "Public read rugby-media objects"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'rugby-media');

drop policy if exists "Admins insert rugby-media objects" on storage.objects;
create policy "Admins insert rugby-media objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'rugby-media'
  and public.is_admin()
);

drop policy if exists "Admins update rugby-media objects" on storage.objects;
create policy "Admins update rugby-media objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'rugby-media'
  and public.is_admin()
)
with check (
  bucket_id = 'rugby-media'
  and public.is_admin()
);

drop policy if exists "Admins delete rugby-media objects" on storage.objects;
create policy "Admins delete rugby-media objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'rugby-media'
  and public.is_admin()
);
