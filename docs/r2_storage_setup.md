# Cloudflare R2 Storage Setup

This project stores relational data in Supabase tables, but media objects in Cloudflare R2.

## 1) Configure a Public R2 URL

Pick one:

- R2 managed domain (`*.r2.dev`)
- Custom domain (recommended), for example: `https://media.jmumensrugbyclub.com`

Set this value in frontend env:

```bash
VITE_R2_PUBLIC_BASE_URL=https://media.jmumensrugbyclub.com
VITE_MAX_R2_UPLOAD_BYTES=12582912
```

For Vercel, set `VITE_R2_PUBLIC_BASE_URL` in Project Settings -> Environment Variables for `Production` (and `Preview` if desired), then redeploy so the built bundle contains the media host.

Set the same value in Supabase function secrets as `R2_PUBLIC_BASE_URL`.

## 2) Configure R2 Bucket CORS

Because the app uploads directly to signed R2 URLs from the browser, bucket CORS must allow `PUT`.

The version-controlled production policy is [`config/r2-cors.json`](../config/r2-cors.json).
It permits the three expected browser origins and limits request headers to
`Content-Type`, which is the only non-safelisted header sent by the current
presigned-upload client.

Equivalent dashboard JSON:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://jmumensrugbyclub.com",
      "https://www.jmumensrugbyclub.com"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Apply and verify the version-controlled policy with an authenticated Wrangler
session:

```bash
npx wrangler login
npx wrangler r2 bucket cors set rugby-media --file config/r2-cors.json
npx wrangler r2 bucket cors list rugby-media
```

After changing CORS, purge cached assets for the media hostname if an existing
cached response still exposes the old headers. Allow up to 30 seconds for R2
CORS propagation before testing again.

## 3) Set Supabase Function Secrets

From the project root (after `supabase link`):

```bash
supabase secrets set \
  R2_ACCOUNT_ID=... \
  R2_BUCKET=rugby-media \
  R2_ACCESS_KEY_ID=... \
  R2_SECRET_ACCESS_KEY=... \
  R2_PUBLIC_BASE_URL=https://media.jmumensrugbyclub.com \
  R2_MAX_UPLOAD_BYTES=12582912 \
  CORS_ORIGINS=http://localhost:5173,https://jmumensrugbyclub.com,https://www.jmumensrugbyclub.com
```

## 4) Deploy the Edge Function

```bash
supabase functions deploy r2-media
```

Function path:

- `supabase/functions/r2-media/index.ts`

## 5) Data Model Notes

- Media table (`media.file_path` / `media.filepath`) now stores object paths, not full URLs.
- Roster and coaches (`headshot_url`) now store object paths.
- Sponsors (`logo_url`) now stores object paths.
- Public URLs are built dynamically in the app using `VITE_R2_PUBLIC_BASE_URL`.

## 6) Security Note

Never put `R2_ACCESS_KEY_ID` or `R2_SECRET_ACCESS_KEY` in frontend environment variables.
