# MedCost India

A directory of Indian network hospitals with a transparent, source-cited
procedure-pricing layer, starting with Bangalore. See
`data-pipeline/build_static_data.py` for how the hospital data is produced
and `DEPLOY.md` for how this ships to both the GitHub Pages POC and the
Vercel full site.

## Development

```bash
npm install
npm run dev
```

## Data pipeline

```bash
python data-pipeline/build_static_data.py
```

Regenerates `data/generated/hospitals.json` from the enriched CSVs in the
sibling `scrap/` repo. Commit the output — CI has no access to `scrap/`.

## Google reviews (Bangalore)

```bash
export OUTSCRAPER_API_KEY=...                                # or APIFY_TOKEN
python data-pipeline/sources/google_reviews.py --limit 10    # smoke test first
python data-pipeline/sources/google_reviews.py               # all 362
python data-pipeline/build_reviews.py                        # strict name+location match
export ANTHROPIC_API_KEY=...
python data-pipeline/build_review_summaries.py               # AI review summaries
```

Produces `data/generated/reviews.json`. Needs `pip install requests anthropic`.
Read the header of `data-pipeline/sources/google_reviews.py` before running it —
it records why this uses a scraping vendor rather than the official Places API,
and what that trade-off costs.
