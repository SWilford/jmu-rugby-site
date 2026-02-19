-- Supabase schema for Join page content that changes often
-- Safe to run in SQL Editor; uses IF NOT EXISTS guards.

create extension if not exists pgcrypto;

create table if not exists public.join_content_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  description text,
  updated_at timestamptz not null default now()
);

create table if not exists public.join_content_schedule (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  detail text not null,
  display_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists join_content_schedule_order_idx
  on public.join_content_schedule (display_order);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_join_content_settings_updated_at on public.join_content_settings;
create trigger trg_join_content_settings_updated_at
before update on public.join_content_settings
for each row
execute function public.set_updated_at();

drop trigger if exists trg_join_content_schedule_updated_at on public.join_content_schedule;
create trigger trg_join_content_schedule_updated_at
before update on public.join_content_schedule
for each row
execute function public.set_updated_at();

-- Seed defaults for values likely to change
insert into public.join_content_settings (key, value, description)
values
  ('dues', '$200 per semester', 'Team dues shown on Join page.'),
  ('conditioning', 'Monday & Wednesday conditioning sessions', 'Conditioning cadence text.'),
  ('travel', 'Travel depends on opponent and event location. Transportation may be UREC vans or player-owned cars, and some trips include overnight stays.', 'Travel blurb shown on Join page.')
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

insert into public.join_content_schedule (label, detail, display_order)
values
  ('Practice', 'Tuesday and Thursday, 5:30 PM - 7:00 PM', 1),
  ('Conditioning', 'Monday and Wednesday team conditioning', 2),
  ('Walkthrough', 'Friday afternoon walkthrough', 3),
  ('Match Day', 'Saturday matches', 4)
on conflict do nothing;

alter table public.join_content_settings enable row level security;
alter table public.join_content_schedule enable row level security;

-- Public read for website visitors
create policy if not exists "Public read join_content_settings"
on public.join_content_settings
for select
using (true);

create policy if not exists "Public read join_content_schedule"
on public.join_content_schedule
for select
using (true);

-- Authenticated users can manage content from admin tooling
create policy if not exists "Authenticated manage join_content_settings"
on public.join_content_settings
for all
to authenticated
using (true)
with check (true);

create policy if not exists "Authenticated manage join_content_schedule"
on public.join_content_schedule
for all
to authenticated
using (true)
with check (true);
