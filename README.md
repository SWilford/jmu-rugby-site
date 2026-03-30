# JMU Men’s Rugby Website

Official website for JMU Men’s Rugby. This project is a React + Vite application that powers the team’s public-facing pages for schedules, roster information, media, recruiting details, and contact links.

## Tech Stack

- React 19
- React Router DOM 7
- Tailwind CSS
- Supabase (for auth + relational data)
- Cloudflare R2 (for media object storage)
- Vite

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_R2_PUBLIC_BASE_URL=https://media.your-domain.com
```

### 3) Run the app

```bash
npm run dev
```

Then open the local URL printed by Vite (usually `http://localhost:5173`).

## Scripts

- `npm run dev` - start development server
- `npm run build` - create production build
- `npm run lint` - run ESLint
- `npm run preview` - preview production build locally
- `npm run test` - run test suite

## Project Structure

```text
src/
  components/      # Shared UI components (Navbar, Footer, tables, lists)
  data/            # Page data sources that can later be replaced by backend fetches
  lib/             # External service clients (Supabase)
  pages/           # Route-level pages
```

## Admin Auth Setup (Supabase)

If you are using the `/admin` login and schedule editor, make sure your database function/policies are configured for admin checks and schedule write protection:

```bash
# In Supabase SQL Editor, run in this order:
# docs/supabase_admin_auth_fix.sql
# docs/supabase_schedule_admin_rls.sql
# docs/supabase_media_admin_rls.sql (media table RLS; storage policies are not used after R2 migration)
```

This ensures `public.is_admin()` and `public.admins` RLS policies work correctly for checking whether a signed-in user UID is in the `admins` table, and ensures only admins can insert/update/delete protected content rows.

## R2 Storage Setup

Object uploads/deletes/moves are handled by a Supabase Edge Function (`r2-media`) that talks to Cloudflare R2.

1. Configure a public URL for your bucket (recommended custom domain, for example `https://media.jmumensrugby.com`) and set:
   `VITE_R2_PUBLIC_BASE_URL`.
2. Create R2 bucket CORS rules that allow browser `PUT` uploads from:
   `http://localhost:5173` and `https://www.jmumensrugby.com`.
3. Set Supabase Edge Function secrets:

```bash
supabase secrets set \
  R2_ACCOUNT_ID=... \
  R2_BUCKET=... \
  R2_ACCESS_KEY_ID=... \
  R2_SECRET_ACCESS_KEY=... \
  R2_PUBLIC_BASE_URL=https://media.your-domain.com \
  CORS_ORIGINS=http://localhost:5173,https://www.jmumensrugby.com
```

4. Deploy the function:

```bash
supabase functions deploy r2-media
```

## Notes for Maintainers

- Schedule, media, and roster content are designed around Supabase tables.
- The Join page currently reads from a local `getJoinInfo()` data access function and is structured to be swapped to Supabase later.
- Keep external links (email/social) up to date with official team accounts.

## Quality Checks

Before opening a PR, run:

```bash
npm run lint
npm run build
```
