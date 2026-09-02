create table public.external_albums (
  id uuid primary key default gen_random_uuid(),
  album text not null check (btrim(album) <> ''),
  external_url text not null check (external_url ~* '^https?://'),
  season_id text not null check (btrim(season_id) <> ''),
  created_at timestamptz not null default now()
);

comment on table public.external_albums is
  'Media gallery albums that open on an external website instead of containing local photos.';

alter table public.external_albums enable row level security;

create policy "Public read external albums"
on public.external_albums
for select to anon, authenticated
using (true);

create policy "Admins insert external albums"
on public.external_albums
for insert to authenticated
with check (public.is_admin());

create policy "Admins update external albums"
on public.external_albums
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins delete external albums"
on public.external_albums
for delete to authenticated
using (public.is_admin());

grant select on table public.external_albums to anon;
grant select, insert, update, delete on table public.external_albums
  to authenticated, service_role;
