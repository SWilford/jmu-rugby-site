-- ============================================================
-- Secure schedule editing so only admins can insert/update/delete
-- while everyone can continue reading the match schedule.
--
-- Prerequisite:
-- - public.is_admin() should already exist and be SECURITY DEFINER.
--   If needed, run docs/supabase_admin_auth_fix.sql first.
--
-- Safe to run multiple times.
-- ============================================================

alter table public.matches enable row level security;

-- Everyone (including anon) can read schedule rows.
drop policy if exists "Public read matches" on public.matches;
create policy "Public read matches"
on public.matches
for select
to anon, authenticated
using (true);

-- Only admins can insert schedule rows.
drop policy if exists "Admins insert matches" on public.matches;
create policy "Admins insert matches"
on public.matches
for insert
to authenticated
with check (public.is_admin());

-- Only admins can update schedule rows.
drop policy if exists "Admins update matches" on public.matches;
create policy "Admins update matches"
on public.matches
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Only admins can delete schedule rows.
drop policy if exists "Admins delete matches" on public.matches;
create policy "Admins delete matches"
on public.matches
for delete
to authenticated
using (public.is_admin());
