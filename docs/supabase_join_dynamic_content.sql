-- ============================================
-- Supabase schema for Join page dynamic content
-- Public read, Admin-only write
-- Safe to run multiple times
-- This tells you what the schema for the dynamic content on the join page is like
-- ============================================

-- 0) Extensions (for gen_random_uuid)
create extension if not exists pgcrypto;

-- 1) Admins table (ties admin privileges to Supabase Auth users)
-- You will insert rows here for the users you want to be admins.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2) Join content settings (key/value)
create table if not exists public.join_content_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  description text,
  updated_at timestamptz not null default now()
);

-- 3) Join schedule rows (ordered list)
create table if not exists public.join_content_schedule (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  detail text not null,
  display_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists join_content_schedule_order_idx
  on public.join_content_schedule (display_order);

-- Prevent duplicate seed rows / duplicate labels
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'join_content_schedule_label_unique'
  ) then
    alter table public.join_content_schedule
      add constraint join_content_schedule_label_unique unique (label);
  end if;
end $$;

-- 4) updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 5) Triggers for updated_at
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

-- 6) Seed defaults (idempotent)

insert into public.join_content_settings (key, value, description)
values
  ('dues', '$200', 'Team dues shown on Join page.'),
  ('conditioning', 'Monday & Wednesday conditioning sessions (morning OR afternoon — player choice).', 'Conditioning cadence text.'),
  ('travel', 'Travel depends on opponent and event location. Transportation may be UREC vans or player-owned cars, and some trips include overnight stays.', 'Travel blurb shown on Join page.'),
  ('fall_season', 'Fall focuses on 15s with A side, B side, and Developmental. We compete in NCR and MARC (and other events as scheduled).', 'Fall season summary.'),
  ('spring_season', 'Spring focuses on 7s. Many players also play 15s in the spring depending on the schedule.', 'Spring season summary.'),
  ('required_gear', 'Mouthguard', 'Required gear for participation.'),
  ('recommended_gear', 'Cleats and rugby shorts', 'Recommended gear.'),
  ('lifting', 'Lifting is on your own, but strongly recommended to get stronger and stay healthy.', 'Lifting note.'),
  ('who_can_join', 'No experience required — everyone is welcome. We will get you fit.', 'Who can join section.')
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

insert into public.join_content_schedule (label, detail, display_order)
values
  ('Practice', 'Tuesday & Thursday, 5:30 PM - 7:00 PM', 1),
  ('Conditioning', 'Monday & Wednesday conditioning (morning or afternoon — player choice)', 2),
  ('Walkthrough', 'Friday afternoon player-driven walkthroughs', 3),
  ('Match Day', 'Saturday matches', 4)
on conflict (label) do update
set detail = excluded.detail,
    display_order = excluded.display_order,
    updated_at = now();

-- 7) RLS
alter table public.join_content_settings enable row level security;
alter table public.join_content_schedule enable row level security;
alter table public.admins enable row level security;

-- 8) Helper: is_admin()
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

-- 9) Policies

-- Public read (anon + authenticated)
drop policy if exists "Public read join_content_settings" on public.join_content_settings;
create policy "Public read join_content_settings"
on public.join_content_settings
for select
using (true);

drop policy if exists "Public read join_content_schedule" on public.join_content_schedule;
create policy "Public read join_content_schedule"
on public.join_content_schedule
for select
using (true);

-- Admin-only write for join_content_settings
drop policy if exists "Admin manage join_content_settings" on public.join_content_settings;
create policy "Admin manage join_content_settings"
on public.join_content_settings
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admin update join_content_settings" on public.join_content_settings;
create policy "Admin update join_content_settings"
on public.join_content_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admin delete join_content_settings" on public.join_content_settings;
create policy "Admin delete join_content_settings"
on public.join_content_settings
for delete
to authenticated
using (public.is_admin());

-- Admin-only write for join_content_schedule
drop policy if exists "Admin manage join_content_schedule" on public.join_content_schedule;
create policy "Admin manage join_content_schedule"
on public.join_content_schedule
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admin update join_content_schedule" on public.join_content_schedule;
create policy "Admin update join_content_schedule"
on public.join_content_schedule
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admin delete join_content_schedule" on public.join_content_schedule;
create policy "Admin delete join_content_schedule"
on public.join_content_schedule
for delete
to authenticated
using (public.is_admin());

-- Admins table policies (only admins can manage admins)
-- Note: This means you must add the FIRST admin via the SQL editor (manual insert).
drop policy if exists "Admins can read admins" on public.admins;
create policy "Admins can read admins"
on public.admins
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins can manage admins" on public.admins;
create policy "Admins can manage admins"
on public.admins
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 10) Join FAQ rows (ordered list)
create table if not exists public.join_content_faq (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists join_content_faq_order_idx
  on public.join_content_faq (display_order);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'join_content_faq_question_unique'
  ) then
    alter table public.join_content_faq
      add constraint join_content_faq_question_unique unique (question);
  end if;
end $$;

-- 11) Sponsors for footer (ordered list)
create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website_url text,
  logo_url text,
  logo_object_path text,
  alt_text text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists sponsors_order_idx
  on public.sponsors (display_order);

-- 12) Triggers for new ordered content tables
drop trigger if exists trg_join_content_faq_updated_at on public.join_content_faq;
create trigger trg_join_content_faq_updated_at
before update on public.join_content_faq
for each row
execute function public.set_updated_at();

drop trigger if exists trg_sponsors_updated_at on public.sponsors;
create trigger trg_sponsors_updated_at
before update on public.sponsors
for each row
execute function public.set_updated_at();

-- 13) Seed FAQ defaults (idempotent)
insert into public.join_content_faq (question, answer, display_order)
values
  ('Do I need experience?', 'No experience is required. JMU Men''s Rugby welcomes beginners and experienced players, and our training structure is designed to teach fundamentals while improving fitness.', 1),
  ('What should I bring?', 'Bring water and wear athletic clothing. A mouthguard is required, cleats and rugby shorts are highly recommended.', 2),
  ('How much does it cost?', 'Team dues are $200.', 3),
  ('How much time is the commitment?', 'The weekly schedule includes Tuesday and Thursday practices from 5:30 PM to 7:00 PM, Monday and Wednesday conditioning sessions, Friday afternoon walkthroughs, and Saturday games.', 4),
  ('Is lifting required?', 'Lifting is not a formal team requirement; however, it is strongly recommended for strength and on-field performance.', 5),
  ('What if I’ve never played a contact sport?', 'That is completely fine. Coaches and veteran players will help you learn techniques and contact fundamentals in a progressive, safe environment.', 6),
  ('How do games/travel work?', 'Travel depends on the opponent and event location; transportation may be by UREC vans or player-owned cars, and some trips include overnight hotel stays.', 7),
  ('What’s the difference between fall and spring season?', 'Fall focuses on 15s with A side, B side, and Developmental. Spring focuses on 7s, and others also play 15s. The team competes under National Collegiate Rugby (NCR) in the Mid-Atlantic Rugby Conference (MARC) at the DI-AA level.', 8),
  ('What day is Saturday?', 'SATURDAYS A RUGBY DAY!', 9)
on conflict (question) do update
set answer = excluded.answer,
    display_order = excluded.display_order,
    is_active = true,
    updated_at = now();

-- 14) RLS policies for FAQ and sponsors
alter table public.join_content_faq enable row level security;
alter table public.sponsors enable row level security;

drop policy if exists "Public read active join_content_faq" on public.join_content_faq;
create policy "Public read active join_content_faq"
on public.join_content_faq
for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "Admins insert join_content_faq" on public.join_content_faq;
create policy "Admins insert join_content_faq"
on public.join_content_faq
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins update join_content_faq" on public.join_content_faq;
create policy "Admins update join_content_faq"
on public.join_content_faq
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete join_content_faq" on public.join_content_faq;
create policy "Admins delete join_content_faq"
on public.join_content_faq
for delete
to authenticated
using (public.is_admin());

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

-- 15) Storage guidance for sponsor logos
-- Keep sponsor logos in a dedicated folder inside the existing `media` bucket:
--   sponsors/<sponsor-file-name>
-- Save that path to sponsors.logo_object_path (for example: sponsors/my-sponsor.png)
-- The app will call storage.from('media').getPublicUrl(logo_object_path).
