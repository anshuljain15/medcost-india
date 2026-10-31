# Deploying MedCost India

One Next.js codebase, two live targets. Neither build branches app/page code on
deploy target — only `lib/data.ts` (data source) and, later, the
upload/review components will.

## POC — GitHub Pages (`https://anshuljain15.github.io/medcost-india/`)

Static export. No server, no database — every page and every hospital route
is pre-rendered at build time from the committed JSON snapshot in
`data/generated/`.

**One-time setup (do this once in the GitHub repo settings):**

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.

That's it — `.github/workflows/deploy-gh-pages.yml` builds with
`NEXT_PUBLIC_DEPLOY_TARGET=static` (which flips on `output: 'export'` and
`basePath: '/medcost-india'` in `next.config.ts`) and publishes `out/` on
every push to `main`. No secrets, no manual deploy step after that.

To refresh the data the POC ships with: re-run
`python data-pipeline/build_static_data.py`, commit the updated
`data/generated/*.json`, and push — the next Actions run picks it up.

## "Share your bill" — Supabase (one-time setup)

Submissions from `/share-bill` go to a Supabase project. Until it's set up the
form shows but says submissions aren't open yet.

1. Create a free project at [supabase.com](https://supabase.com) (region:
   Mumbai, `ap-south-1`).
2. **SQL Editor → New query**: paste all of
   `supabase/migrations/0001_bill_reports.sql` and run it.
3. **Project Settings → API**: copy the **Project URL** and the
   **anon / publishable** key. Never use the `service_role` / secret key here.
4. GitHub repo → **Settings → Secrets and variables → Actions → Variables**:
   add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` with those values.
5. Re-run the "Deploy POC to GitHub Pages" workflow (or push any commit).

**Moderating:** Table Editor → `bill_reports`, filter `status = pending`,
and set each row to `approved` or `rejected`. Only approved rows count, and a
city + procedure appears on the site once it has 5 approved bills from 3
different browsers. Hospitals are never shown.

For Vercel, add the same two values as `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` environment variables.

## Full site — Vercel

Same repo, normal Next.js build (`output` unset → SSR/ISR/API routes all
work). This is where the database, bill uploads, and live Google Places
widget will live as those phases land.

**One-time setup (needs your Vercel account, can't be scripted from here):**

1. In the [Vercel dashboard](https://vercel.com/new), import
   `anshuljain15/medcost-india`.
2. Leave the framework preset as **Next.js** and the build command as
   `next build` — do **not** set `NEXT_PUBLIC_DEPLOY_TARGET`, so it stays
   unset and the app builds in full/server mode.
3. Once the DB-backed data source (`lib/data/db-source.ts`, Phase 6 of the
   plan) exists, add its connection string as a Vercel environment variable
   at that point — nothing needed yet.

After that one-time import, every push to `main` deploys automatically.

## Local development

```bash
npm run dev                                    # full mode (default)
NEXT_PUBLIC_DEPLOY_TARGET=static npm run build  # static-export smoke test
```
