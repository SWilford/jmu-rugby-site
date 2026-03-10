# JMU Men’s Rugby Website

Official website for JMU Men’s Rugby. This project is a React + Vite application that powers the team’s public-facing pages for schedules, roster information, media, recruiting details, and contact links.

## Tech Stack

- React 19
- React Router DOM 7
- Tailwind CSS
- Supabase (for match/media/team data)
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
```

This ensures `public.is_admin()` and `public.admins` RLS policies work correctly for checking whether a signed-in user UID is in the `admins` table, and ensures only admins can insert/update/delete `matches` rows.

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
