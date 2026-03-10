-- ============================================================
-- Fix admin auth checks so `/admin` login works reliably.
--
-- Why this exists:
-- - If `public.admins` policies call `public.is_admin()` while
--   `public.is_admin()` queries `public.admins`, policy recursion can
--   prevent valid admins from being recognized.
--
-- Safe to run multiple times.
-- ============================================================

-- 1) Harden is_admin() to bypass RLS safely using SECURITY DEFINER.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 2) Replace admins policies to avoid recursion pitfalls.
alter table public.admins enable row level security;

-- authenticated users can see their own admin row
-- (helps with direct client-side checks by UID)
drop policy if exists "Admins can read admins" on public.admins;
create policy "Admins can read admins"
on public.admins
for select
to authenticated
using (
  user_id = auth.uid() or public.is_admin()
);

-- only admins can insert / update / delete admins rows
drop policy if exists "Admins can manage admins" on public.admins;
create policy "Admins can manage admins"
on public.admins
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
