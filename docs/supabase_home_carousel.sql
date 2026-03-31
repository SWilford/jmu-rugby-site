-- Add a dedicated home carousel flag on media rows.
-- Safe to run multiple times.

alter table public.media
  add column if not exists home_carousel boolean not null default false;

create index if not exists media_home_carousel_true_idx
  on public.media (id)
  where home_carousel = true;
