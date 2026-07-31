-- S-07: Remove the retired Supabase Storage bucket configuration.
-- Filename version matches the production migration history.
--
-- Production objects and the bucket itself are deleted through the Storage API
-- before this migration is applied. The guarded bucket-row deletion below is
-- for clean local rebuilds, where the data-free baseline creates an empty
-- legacy bucket.

drop policy if exists "Admins delete rugby-media headshots objects"
  on storage.objects;
drop policy if exists "Admins delete rugby-media objects"
  on storage.objects;
drop policy if exists "Admins delete rugby-media sponsors objects"
  on storage.objects;
drop policy if exists "Admins insert rugby-media headshots objects"
  on storage.objects;
drop policy if exists "Admins insert rugby-media objects"
  on storage.objects;
drop policy if exists "Admins insert rugby-media sponsors objects"
  on storage.objects;
drop policy if exists "Admins update rugby-media headshots objects"
  on storage.objects;
drop policy if exists "Admins update rugby-media objects"
  on storage.objects;
drop policy if exists "Admins update rugby-media sponsors objects"
  on storage.objects;
drop policy if exists "Public read rugby-media headshots objects"
  on storage.objects;
drop policy if exists "Public read rugby-media objects"
  on storage.objects;
drop policy if exists "Public read rugby-media sponsors objects"
  on storage.objects;

do $$
begin
  if exists (
    select 1
    from storage.buckets
    where id = 'rugby-media'
  ) then
    if exists (
      select 1
      from storage.objects
      where bucket_id = 'rugby-media'
    ) then
      raise exception
        'Refusing to retire non-empty Supabase Storage bucket rugby-media';
    end if;

    -- Hosted production is already deleted through the Storage API, so this
    -- branch runs only when rebuilding the historical baseline locally.
    perform set_config('storage.allow_delete_query', 'true', true);
    delete from storage.buckets
    where id = 'rugby-media';
    perform set_config('storage.allow_delete_query', 'false', true);
  end if;
end;
$$;
