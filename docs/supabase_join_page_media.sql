-- Add a dedicated Join page media flag on media rows.
-- Safe to run multiple times.

alter table public.media
  add column if not exists join_page boolean not null default false;

create index if not exists media_join_page_true_idx
  on public.media (id)
  where join_page = true;
