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
