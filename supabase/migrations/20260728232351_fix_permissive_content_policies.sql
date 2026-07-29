-- S-01: Remove obsolete permissive and duplicate content policies.
--
-- The intended admin-only write and scoped public-read policies already exist.
-- PostgreSQL combines permissive policies with OR, so the legacy policies below
-- bypass those stricter rules. Dropping them changes no table data.

-- FAQs: retain active-row public reads and admin-only writes.
drop policy if exists "Enable insert for authenticated users only"
on public.join_content_faq;

drop policy if exists "Enable read access for all users"
on public.join_content_faq;

-- Media: retain public reads and admin-only writes.
drop policy if exists "Enable insert for authenticated users only"
on public.media;

drop policy if exists "Enable read access for all users"
on public.media;

drop policy if exists "Enable delete for authenticated users only"
on public.media;

-- Sponsors: retain active-row public reads and admin-only writes.
drop policy if exists "Enable insert for authenticated users only"
on public.sponsors;

drop policy if exists "Enable read access for all users"
on public.sponsors;
