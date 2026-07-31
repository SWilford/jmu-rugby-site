-- S-07: Point the two remaining sponsor logos at Cloudflare R2.
-- Filename version matches the production migration history.
--
-- The objects were copied to the existing rugby-media R2 bucket and verified
-- byte-for-byte before this migration was applied. Matching the exact legacy
-- URL keeps this migration idempotent and prevents unrelated sponsor rows from
-- being changed.

update public.sponsors
set
  logo_url = 'sponsors/jmhj2.jpg',
  logo_object_path = 'sponsors/jmhj2.jpg',
  updated_at = now()
where name = 'James McHone Jewelry'
  and logo_url =
    'https://pynvimffqpfhwttlbuao.supabase.co/storage/v1/object/public/rugby-media/sponsors/jmhj2.jpg';

update public.sponsors
set
  logo_url = 'sponsors/jcmrf.jpg',
  logo_object_path = 'sponsors/jcmrf.jpg',
  updated_at = now()
where name = 'John Carr Memorial Rugby Fund'
  and logo_url =
    'https://pynvimffqpfhwttlbuao.supabase.co/storage/v1/object/public/rugby-media/sponsors/jcmrf.jpg';
