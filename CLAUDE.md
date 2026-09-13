# CLAUDE.md

Guidance for Claude Code working in this repo.

## What this is

**MedCost India** — a directory of Indian network hospitals with a source-cited
procedure-pricing layer on top. 2,684 hospitals across 6 cities; pricing is a
Bangalore-only pilot (~200 procedures).

The product promise, which constrains most technical decisions: **every price is a
range with a visible source and date, never a single made-up number.** A wrong
price attributed to a named hospital is a factual error about a real business, not
a cosmetic bug. Precision beats coverage everywhere in this codebase.

Note: unlike US price-transparency products, there is **no payer/plan dimension**.
Pricing here is `procedure -> rate`, not `procedure x payer -> negotiated rate`.
Don't introduce a payer axis.

## Architecture

Three layers, deliberately decoupled so the data source can be swapped without
touching page code:

```
  Python scrapers            Python builders           committed snapshot        Next.js app
  ----------------           ---------------           -----------------        -----------
  sources/cghs.py      ->    build_procedures.py  ->   data/generated/     ->   lib/data.ts
  sources/hexahealth.py                                  procedures.json          lib/cghs.ts
  ../scrap/*.csv       ->    build_static_data.py ->     cghs_rates.json          lib/reviews.ts
  sources/google_      ->    build_reviews.py     ->     hospitals.json      ->  app/** (RSC +
    reviews.py               build_review_            + reviews.json              client pages)
                             summaries.py               meta.json
```

- **The Python pipeline never runs in CI.** Its outputs are committed. CI has no
  access to the sibling `scrap/` repo or to `data-pipeline/output/` (gitignored).
- **`lib/data.ts`, `lib/cghs.ts` and `lib/reviews.ts` are the only data-access
  seam.** Everything above them reads typed functions, not JSON. When a Postgres
  source lands (planned), it replaces those three modules and nothing else. Do
  not import `data/generated/*.json` from a component or a page.
- **`lib/types.ts` is the contract** between the Python builders and the app.
  Changing a field name means changing both sides plus the committed JSON.

### Two deploy targets, one codebase

`NEXT_PUBLIC_DEPLOY_TARGET=static` is the only switch (`next.config.ts`):

| | GitHub Pages (POC) | Vercel (full site) |
|---|---|---|
| env | `NEXT_PUBLIC_DEPLOY_TARGET=static` | unset |
| config | `output: 'export'`, `basePath: '/medcost-india'`, unoptimized images | defaults |
| capabilities | fully pre-rendered, no server | SSR/ISR/API routes available |
| trigger | `.github/workflows/deploy-gh-pages.yml` on push to `main` | Vercel on push to `main` |

**Neither target may branch app or page code.** Only `lib/data.ts` (and, later, the
upload/review components) is allowed to differ by target. Anything you add must
survive static export — so no API routes, no server-only runtime, no
`dynamicParams: true` on the paths the POC ships.

Every dynamic route sets `dynamicParams = false` and a `generateStaticParams`.
Keep it that way.

## Data model

`lib/types.ts`:

- `Hospital` — directory row. Almost every field is nullable (`address`, `pincode`,
  `lat`/`lon`, `bedCount`, …); the source CSVs are sparse. Render defensively.
  Numeric-looking fields (`bedCount`, `totalDoctors`, `nabhFlag`) are typed
  `string | null` on purpose — the source is free text.
- `Procedure` — a HexaHealth market range (`cityLow`/`cityHigh`), per-hospital
  prices, and a best-effort `cghsReference`. `hospitalSlug` is `null` when the
  quoted hospital could not be matched to our directory with certainty.
- `CghsRate` — one row per (code, NABH) with all three ward prices. Amounts are
  `string | null` as scraped.
- `HospitalReviews` — scraped Google rating, review count, top reviews, photos
  and an AI `summary`, keyed by hospital slug. Bangalore only, and present only
  for hospitals that cleared the strict match — an absent slug means "not
  confident", and the UI shows no review section at all.

Identity: a hospital is `(city, slug)`; slugs are de-duplicated with a `-2`
suffix at build time, and `build_static_data.py` asserts uniqueness of both
`id` and `(city, slug)`. A procedure is a bare `slug`.

## The matching rules (read before touching `build_procedures.py`)

These heuristics were tuned against real failures. The comments in the file
record the specific bugs; don't "improve" them into a similarity score.

- **Hospital names — exact token-set equality**, after stripping structural
  stopwords. Never subset, never fuzzy. Chains (Manipal, Apollo, Aster, Sakra,
  Sparsh) have many Bangalore branches; a subset match links a real price to the
  wrong physical branch. Token sets that collide between two hospitals are
  dropped from the index entirely rather than guessed.
- **Procedure names — token subset, stemmed**, against Tier I / NABH / general-ward
  CGHS rows only. Character-similarity ratios previously matched "Angioplasty" to
  "Vaginoplasty" at 0.87.
- **Single-token queries that match several clinically distinct CGHS rows return
  `None`.** Picking the shortest name was wrong twice.
- `CGHS_QUERY_BLOCKLIST` holds hand-verified false positives. Add to it rather
  than loosening the matcher.

Unmatched is a supported, visible state. Prefer `null` over a plausible guess.

## Google reviews (Bangalore)

`data-pipeline/sources/google_reviews.py` -> `build_reviews.py` ->
`data/generated/reviews.json` -> `lib/reviews.ts`.

**Why a scraping vendor and not the Places API.** Google's Places policy forbids
pre-fetching, caching or storing Places content; place IDs may be stored
indefinitely, but ratings, review text, photos and phone numbers must be fetched
live with attribution. A committed JSON snapshot pre-rendered to static HTML is
the opposite of that, so the official API cannot feed `data/generated/`. Using a
vendor instead was a deliberate, documented decision — it breaches Google's ToS
and republishing review text carries copyright exposure. Read the module
docstring before changing anything here.

Because of that, four things are load-bearing and must not be quietly dropped:
author attribution on every review, a link back to the review on Google Maps,
photos **hotlinked and never re-hosted**, and a visible fetch date.

**Matching is name AND location, both required** (`build_reviews.py`):

- Name token sets **exactly equal** — `tokenize()` and `HOSPITAL_STOPWORDS` are
  imported from `build_procedures.py`, not re-implemented. Don't fork them. But
  that module's "at least 2 tokens" guard is deliberately **not** carried over:
  78 of 362 Bangalore hospitals (21.5%) are one brand word plus "hospital"
  (`ZYMUS HOSPITAL` -> `{zymus}`), and the guard drops every one of them
  silently. The mandatory coordinate check is what makes that safe.
- Coordinates within `MAX_DISTANCE_M` (150 m); pincode-in-address is the fallback
  for the 2 Bangalore rows with no coordinates.
- Location is what makes the name rule safe. `build_procedures.py` has to discard
  hospitals whose name tokens collide, because HexaHealth gives it only a name;
  here distance separates two branches of a chain, so those 19 Bangalore
  hospitals stay in.
- Two hospitals resolving to the **same** `placeId` is real ambiguity — both are
  dropped, the same call `build_hospital_index` makes.

Summaries come from `build_review_summaries.py` (Claude via the Message Batches
API). They must always render with the AI-generated label and disclaimer.

## Frontend conventions

- **Next.js 16 App Router, React 19, Tailwind v4, TypeScript strict.** Path alias
  `@/*` -> repo root.
- **Theming**: CSS custom properties in `app/globals.css`, surfaced to Tailwind via
  `@theme inline`. Use the semantic scales — `brand-*`, `ink-*`, `bg-background`,
  `bg-surface` — never raw hex or Tailwind's stock palette. The `ink-*` scale
  *inverts* under `[data-theme="dark"]`; for a band that must stay dark in both
  themes use `bg-contrast` / `text-contrast-fg`.
- **No-flash theme**: `NO_FLASH_THEME_SCRIPT` in `lib/theme/ThemeProvider.tsx` is
  inlined by `app/layout.tsx` and sets `data-theme` before hydration. If you change
  the storage key or the resolution order, change both places.
- **i18n**: `useTranslation()` from `lib/i18n/LanguageProvider`; keys are dotted
  paths into `lib/i18n/translations.ts` with `{var}` interpolation. All user-facing
  chrome goes through `t()` and needs both `en` and `hi`. **Data text is never
  translated** — hospital names, addresses, procedure names, CGHS line items stay
  in the source language, for the same reason the matchers are conservative.
- **Money** always renders through `formatINR()` (en-IN grouping, em-dash for null).
- Server components hold the routing and data lookup; the interactive view is a
  sibling `components/*View.tsx` or `*Client.tsx` marked `"use client"`. Follow
  that split for new routes.

### The map

`components/HospitalMap.tsx` (MapLibre GL, OpenFreeMap tiles) is loaded only
through `HospitalMapLoader.tsx` with `next/dynamic` + `ssr: false` — it touches
`window` and WebGL. Two hard-won details, both already fixed:

- A **`ResizeObserver` calls `map.resize()`**. Without it the map can construct
  against a 0x0 flex parent and paint into an invisible canvas — the "blank white
  box" bug. Don't remove it.
- Map construction and `map.on("error")` both fall back to a visible message; the
  hospital list must keep working when the map doesn't (no WebGL, tiles blocked).

Its container needs an explicit height (`h-[520px]` in `CityView`).

## Commands

```bash
npm run dev                                       # full mode (default)
npm run build                                     # Vercel-shaped build
NEXT_PUBLIC_DEPLOY_TARGET=static npm run build    # static-export smoke test
npm run lint

python data-pipeline/sources/cghs.py              # -> data-pipeline/output/ (gitignored)
python data-pipeline/sources/hexahealth.py [city] # resumable via JSONL cache
python data-pipeline/build_static_data.py         # needs sibling ../scrap/*.csv
python data-pipeline/build_procedures.py          # needs data-pipeline/output/

python data-pipeline/sources/google_reviews.py --limit 10  # smoke test FIRST (costs money)
python data-pipeline/sources/google_reviews.py             # needs OUTSCRAPER_API_KEY
python data-pipeline/build_reviews.py                      # strict name+location match
python data-pipeline/build_review_summaries.py             # needs ANTHROPIC_API_KEY
```

There is no test suite. `npm run lint` and a static-export build are the
available checks — run both before calling a change done.

After re-running a builder, **commit `data/generated/*.json`** or neither deploy
target sees the change. Check the builder's printed match counts before
committing: a sudden jump in matched hospitals usually means the matcher got
looser, not better.

## Gotchas

- **The pipeline is not reproducible in CI or from a clean clone.**
  `build_static_data.py` reads `../scrap/bajaj_hospitals_*_enriched.csv` (a sibling
  repo, not vendored) and `build_procedures.py` reads `data-pipeline/output/`
  (gitignored). Regenerating data requires both. The committed JSON is the
  source of truth for anyone else.
- **`data/generated/` is statically imported, so it lands in the client bundle.**
  `hospitals.json` is 1.5 MB and `cghs_rates.json` 1.0 MB, and the pages that read
  them (`app/hospitals/page.tsx`, `app/rates/page.tsx`, `app/page.tsx`) are
  `"use client"`. This is a known weight problem, not a pattern to copy — prefer a
  server component that passes only the slice a client component needs.
- **Coordinates are dirty.** `clean_coord_pair` in `build_static_data.py` rejects
  out-of-India values, swaps transposed lat/lon, and rescales by powers of ten.
  It repairs most of them: 2,659 / 2,684 rows (99.1%) end up mappable, so a
  null `lat`/`lon` is the rare case (25 rows), not the norm.
- **Reviews must be read in a server component.** `app/hospitals/[city]/[slug]/page.tsx`
  calls `getReviewsForHospital()` and passes one record down as a prop. Importing
  `lib/reviews.ts` from a `"use client"` component ships every hospital's reviews
  to every visitor — the same trap as `hospitals.json` above. Verified by seeding
  one record and grepping `.next/static/` for it; keep that invariant.
- `.env` holds a GitHub token and is gitignored. Never read it into app code,
  echo it, or commit it.
- The two `eslint-disable react-hooks/set-state-in-effect` lines in the providers
  are deliberate — they hydrate `localStorage` state after mount to avoid a
  hydration mismatch.

## Adding things

- **A new city's hospitals** — add its CSV to `scrap/`, re-run
  `build_static_data.py`, commit the JSON. Routes and `generateStaticParams`
  pick it up with no code change.
- **Pricing for a second city** — `build_procedures.py` currently hard-codes
  `city == "Bangalore"` in `build_hospital_index`, and
  `app/hospitals/[city]/[slug]/page.tsx` gates the procedure section on
  `city === "bangalore"`. Both must change together.
- **A new page** — server component for params and data, client view component for
  interaction, every string through `t()` in both locales, and verify it under
  `NEXT_PUBLIC_DEPLOY_TARGET=static npm run build`.

See `README.md` for a short overview and `DEPLOY.md` for the deploy runbook.
