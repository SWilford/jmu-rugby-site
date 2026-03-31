# JMU Men's Rugby Web Platform - Project Dossier

This repository is not just a static site codebase. It is the operating system for a college rugby program's public brand, admin workflows, and media pipeline.

This document is written as an expanded project descriptor so a new maintainer, teammate, sponsor, or reviewer can understand exactly how this system works across frontend, backend, hosting, DNS, storage, auth, and security.

## 1) Platform Mission and Scope

Primary outcomes this platform delivers:
- Publishes team information (home, schedule, roster, coaches, media, recruiting/join, contact, donate).
- Gives authorized admins a browser-based content management interface at `/admin`.
- Keeps public reads open and fast while locking all writes to admin users only.
- Stores media in Cloudflare R2 (cost-efficient object storage) while relational data stays in Supabase.
- Deploys frontend through Vercel with SPA routing and baseline security headers.

## 2) Stack and Service Ownership

Frontend application:
- React 19 + React Router 7 + Vite 7 + Tailwind 4 + Framer Motion.
- Built as a client-side SPA.

Backend/data/auth:
- Supabase Auth for admin sign-in.
- Supabase Postgres tables for structured content.
- Supabase RLS policies enforce admin-only writes.
- Supabase Edge Function (`r2-media`) brokers privileged media operations to Cloudflare R2.

Object storage and CDN edge:
- Cloudflare R2 bucket: `rugby-media`.
- Public media domain: `media.jmumensrugby.com`.
- R2 object paths are stored in DB; public URLs are built at runtime.

Web hosting:
- Vercel serves the frontend build output.
- `vercel.json` includes SPA rewrite + response security headers.

Domain and DNS boundaries:
- Namecheap is the domain registrar (ownership and renewal of the base domain).
- Cloudflare is the active DNS and edge security/caching layer for the zone.
- Vercel hosts the application origin.
- R2 custom domain serves public objects.

## 3) End-to-End System Flow

### Public read flow
1. Visitor requests the site from Vercel.
2. React app loads and reads public content from Supabase tables.
3. Media URLs are derived from stored object paths + `VITE_R2_PUBLIC_BASE_URL`.
4. Browser fetches media from `media.jmumensrugby.com` (Cloudflare/R2 path).

### Admin write flow (DB content)
1. Admin logs in at `/admin` using Supabase Auth email/password.
2. App validates admin status via `public.is_admin()` (and `public.admins` fallback).
3. Admin UI enables editors (schedule, roster/coaches, media metadata, contact cards, sponsors).
4. Writes are attempted with authenticated client session.
5. Supabase RLS allows write only if user is admin.

### Admin write flow (media objects)
1. Admin action calls `supabase.functions.invoke("r2-media")`.
2. Edge Function verifies request origin + auth token + admin status.
3. Function signs upload / deletes / moves in R2 using service credentials.
4. Browser uploads directly to signed R2 URL for efficient transfer.

## 4) Frontend Architecture Summary

Route map (`src/App.jsx`):
- `/` Home
- `/about`
- `/schedule`
- `/team`
- `/media`
- `/join`
- `/donate`
- `/contact`
- `/admin`
- `*` NotFound

Core frontend modules:
- `src/pages/*` route-level screens.
- `src/components/Admin/*` operational editors for protected data.
- `src/lib/supabaseClient.js` Supabase client bootstrap.
- `src/lib/storageUtils.js` media URL building, path normalization, and Edge Function calls.
- `src/lib/mediaUtils.js` media path/season helpers.
- `src/data/joinInfo.js` dynamic join page composition from Supabase with safe fallback values.

## 5) Backend Data Model (Supabase)

Primary public/admin content tables in active use:
- `matches` (schedule)
- `media`
- `roster`
- `coaches`
- `contact_cards`
- `sponsors`
- `admins` (admin allow-list by auth user UUID)
- `join_content_settings`
- `join_content_schedule`
- `join_content_faq`

Admin auth helper function:
- `public.is_admin()` (SECURITY DEFINER pattern in hardening scripts)

SQL and policy files:
- `docs/supabase_admin_auth_fix.sql`
- `docs/supabase_schedule_admin_rls.sql`
- `docs/supabase_media_admin_rls.sql`
- `docs/supabase_roster_admin_rls.sql`
- `docs/supabase_contact_admin_rls.sql`
- `docs/supabase_sponsors_admin_rls.sql`
- `docs/supabase_join_dynamic_content.sql`

## 6) Security Model and Controls

### Supabase controls
- Row Level Security enabled on protected tables.
- Public read + admin-only insert/update/delete for managed content.
- Admin identity tied to `auth.uid()` membership in `public.admins`.

### Edge Function controls (`supabase/functions/r2-media/index.ts`)
- Allowed origins gate via `CORS_ORIGINS`.
- Requires Authorization header and valid Supabase user session.
- Requires admin access (RPC + service-role checked fallback).
- Upload restrictions:
  - Allowed image MIME types only.
  - Max upload bytes enforced (`R2_MAX_UPLOAD_BYTES`, default 12 MB).
- Delete safety:
  - Max objects per request capped.
  - Object path normalization and validation.

### Vercel controls (`vercel.json`)
- SPA rewrite of all routes to `/`.
- Security response headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

### Cloudflare controls (operational)
- R2 custom domain for public media.
- Cache Rules / Tiered Cache / rate limiting / WAF custom rules configured in Cloudflare dashboard (not in this repo).
- `r2.dev` should be disabled once custom domain is fully validated for lower exposure.

## 7) Cost-Control Design (Cloudflare-Focused)

Built into code today:
- Long-lived immutable cache-control on uploads.
- Upload size ceiling and file-type filtering.
- No frontend exposure of R2 secret credentials.
- Object-path storage instead of DB blobs.

Operational controls to keep tuned in Cloudflare:
- Cache aggressively on `media.jmumensrugby.com`.
- Enable Smart Tiered Cache.
- Keep anti-abuse protections active on media host.
- Monitor R2 operations trend (Class A/B behavior) in Cloudflare billing/analytics.

## 8) Environment Variables and Secrets

Frontend `.env`:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_R2_PUBLIC_BASE_URL=https://media.your-domain.com
VITE_MAX_R2_UPLOAD_BYTES=12582912
```

Supabase Edge Function secrets:
```bash
supabase secrets set \
  R2_ACCOUNT_ID=... \
  R2_BUCKET=rugby-media \
  R2_ACCESS_KEY_ID=... \
  R2_SECRET_ACCESS_KEY=... \
  R2_PUBLIC_BASE_URL=https://media.your-domain.com \
  R2_MAX_UPLOAD_BYTES=12582912 \
  CORS_ORIGINS=http://localhost:5173,https://www.jmumensrugby.com
```

Critical secret handling policy:
- Never expose `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, or service-role credentials in frontend variables.

## 9) Local Development and Verification

Install:
```bash
npm install
```

Run dev server:
```bash
npm run dev
```

Quality checks:
```bash
npm run lint
npm run test
npm run build
```

## 10) Deployment and Operations Runbook

### Vercel deployment
1. Push to repo branch connected to Vercel project.
2. Vercel builds with `vite build`.
3. Confirm SPA routing and security headers are present.

### Supabase migrations and policies
1. Run admin function/policy SQL scripts in Supabase SQL editor.
2. Confirm at least one admin row exists in `public.admins`.
3. Validate `/admin` login and write operations.

### R2 media pipeline
1. Confirm bucket CORS allows frontend origins.
2. Confirm custom media domain resolves and serves objects.
3. Confirm `r2-media` Edge Function deployed and secrets set.
4. Confirm upload/delete/move from admin UI works.

## 11) Service Ownership Matrix

Namecheap:
- Domain registration lifecycle and renewal.

Cloudflare:
- DNS authority for zone.
- R2 bucket and custom domain.
- Caching, WAF/rate limiting, anti-abuse controls.

Vercel:
- Frontend hosting/deploy pipeline.
- Response headers and route rewrites via `vercel.json`.

Supabase:
- Authentication.
- Postgres tables + RLS policy enforcement.
- Edge Function runtime for privileged storage mediation.

## 12) Repository File Guide

Primary code/config files:
- `src/App.jsx`
- `src/pages/Admin.jsx`
- `src/lib/supabaseClient.js`
- `src/lib/storageUtils.js`
- `src/lib/mediaUtils.js`
- `supabase/functions/r2-media/index.ts`
- `vercel.json`
- `docs/*.sql`
- `docs/r2_storage_setup.md`

## 13) Current Positioning

This project is already beyond a brochure site. It is a multi-provider content platform with:
- authenticated admin operations,
- policy-backed write security,
- object storage lifecycle management,
- and edge-hosted delivery.

In resume terms: this is production web platform ownership spanning product UX, data modeling, policy security, CDN/storage cost control, and cross-vendor infrastructure integration.
