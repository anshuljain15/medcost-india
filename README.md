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

## Medicine prices and Jan Aushadhi stores

```bash
pip install pdfplumber openpyxl
python data-pipeline/sources/janaushadhi.py     # product list CSV + state-wise Kendra PDFs
python data-pipeline/sources/nppa.py            # NPPA ceiling-price xlsx
python data-pipeline/sources/open_medicines.py  # Kaggle A-Z dataset CSV
python data-pipeline/sources/cdci.py            # NRCeS CDCI flat files (salt vocabulary)
python data-pipeline/medicine_parse.py          # parser self-checks
python data-pipeline/build_medicines.py
```

All four inputs are manual downloads into `medcost_fairprice/` (gitignored; see
each loader's docstring for where to get them). Produces
`data/generated/medicines.json`, `data/generated/kendras.json` and the shards
under `public/data/`. Commit all three.

The medicine data is CC BY-SA 4.0, because brand prices come from the
[A-Z Medicine Dataset of India](https://www.kaggle.com/datasets/shudhanshusingh/az-medicine-dataset-of-india)
(Nov 2022 snapshot). Jan Aushadhi (PMBJP) and NPPA data are Government of
India publications; CDCI is CC BY 4.0 (C-DAC / NRCeS).
