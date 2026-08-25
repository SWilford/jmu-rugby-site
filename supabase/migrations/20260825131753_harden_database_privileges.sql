-- S-10: Reduce Data API grants to the operations used by the website.
--
-- RLS remains the row-level authorization boundary. These grants add a
-- separate object-level boundary so a future policy mistake cannot expose
-- operations the browser never needs.

revoke all privileges on all tables in schema public
  from public, anon, authenticated, service_role;

revoke all privileges on all sequences in schema public
  from public, anon, authenticated, service_role;

-- Anonymous visitors only read content rendered by public pages. The admins
-- table is intentionally omitted.
grant select on table
  public.coaches,
  public.contact_cards,
  public.donate_content_settings,
  public.join_content_faq,
  public.join_content_schedule,
  public.join_content_settings,
  public.matches,
  public.media,
  public.roster,
  public.sponsors
to anon;

-- Signed-in website accounts use the admin editors. RLS and is_admin() still
-- decide which rows those accounts may read or modify.
grant select, insert, update, delete on table
  public.admins,
  public.coaches,
  public.contact_cards,
  public.donate_content_settings,
  public.join_content_faq,
  public.join_content_schedule,
  public.join_content_settings,
  public.matches,
  public.media,
  public.roster,
  public.sponsors
to authenticated;

-- Retain normal server-side data access without granting structural table
-- privileges such as TRUNCATE, REFERENCES, or TRIGGER.
grant select, insert, update, delete on table
  public.admins,
  public.coaches,
  public.contact_cards,
  public.donate_content_settings,
  public.join_content_faq,
  public.join_content_schedule,
  public.join_content_settings,
  public.matches,
  public.media,
  public.roster,
  public.sponsors
to service_role;

-- Only authenticated and server-side inserts use identity-backed tables.
grant usage on sequence
  public.contact_cards_id_seq,
  public.donate_content_settings_id_seq,
  public.media_id_seq
to authenticated, service_role;

-- The existing public-read policies also used is_admin() so authenticated
-- editors could see inactive rows. Split those policies by role before
-- removing anonymous function execution; anonymous reads must never need the
-- privileged helper.
alter policy "Public read active contact cards"
on public.contact_cards
to anon
using (is_active = true);

create policy "Authenticated read contact cards"
on public.contact_cards
for select to authenticated
using (is_active = true or public.is_admin());

alter policy "Public read active join_content_faq"
on public.join_content_faq
to anon
using (is_active = true);

create policy "Authenticated read join_content_faq"
on public.join_content_faq
for select to authenticated
using (is_active = true or public.is_admin());

alter policy "Public read active sponsors"
on public.sponsors
to anon
using (is_active = true);

create policy "Authenticated read sponsors"
on public.sponsors
for select to authenticated
using (is_active = true or public.is_admin());

-- SECURITY DEFINER is required here to avoid recursive RLS while checking the
-- admins table. The empty search path and qualified names prevent object-name
-- substitution. Anonymous RPC access is unnecessary; the Admin page and R2
-- signing function still call this RPC with an authenticated JWT.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins as a
    where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin()
  from public, anon, authenticated, service_role;
grant execute on function public.is_admin()
  to authenticated, service_role;

-- This function is invoked by existing triggers, not through the Data API.
-- Fix its search path and remove direct execution from browser/server roles.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_updated_at()
  from public, anon, authenticated, service_role;

-- Make least privilege the default for future public-schema objects created by
-- the migration owner. New API exposure must be explicit and paired with RLS.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables
  from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences
  from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions
  from public, anon, authenticated, service_role;
