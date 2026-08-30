"""
Build the JSON snapshot the Next.js app reads. Both deploy targets (the
GitHub Pages POC and the Vercel full site) consume this file today; a
Postgres data source is added later without changing this script.

Reads the enriched per-city CSVs already produced in ../../scrap, cleans
coordinates, drops columns confirmed 0%-populated across all 2,684 rows,
and writes data/generated/hospitals.json + meta.json.
"""

import json
import re
import unicodedata
from pathlib import Path

import pandas as pd

SCRAP_DIR = Path(__file__).resolve().parent.parent.parent / "scrap"
OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "generated"

CITY_FILE_RE = re.compile(r"bajaj_hospitals_(.+)_(.+)_enriched\.csv$")

LAT_LO, LAT_HI = 6.0, 38.0
LON_LO, LON_HI = 68.0, 98.0

DEAD_COLUMNS = [
    "avg_admission_time", "avg_discharge_time",
    "avg_los_medical_days", "avg_los_surgical_days",
    "c_section_rate", "total_beds",
]


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text


def clean_coord_pair(raw_lat, raw_lon):
    def to_float(v):
        try:
            return float(str(v).strip().rstrip(","))
        except (TypeError, ValueError):
            return None

    lat, lon = to_float(raw_lat), to_float(raw_lon)
    if lat is None or lon is None:
        return None, None

    if abs(lat) == 90.0 or abs(lon) in (170.0, 174.0, 180.0):
        return None, None
    if lat < 0 or lon < 0:
        return None, None

    if lat > LAT_HI and lon < LAT_HI:
        lat, lon = lon, lat

    def rescale(v, lo, hi):
        for _ in range(8):
            if lo <= v <= hi:
                return v
            v /= 10
        return None

    lat2 = rescale(lat, LAT_LO, LAT_HI)
    lon2 = rescale(lon, LON_LO, LON_HI)
    if lat2 is None or lon2 is None:
        return None, None
    return lat2, lon2


def clean_str(v):
    if pd.isna(v):
        return None
    v = str(v).strip()
    return v if v and v.lower() != "null" else None


def load_city_csv(path: Path, state: str, city: str) -> list[dict]:
    df = pd.read_csv(path, dtype={"hospital_id": str})
    df = df.drop(columns=[c for c in DEAD_COLUMNS if c in df.columns])

    records = []
    seen_slugs: dict[str, int] = {}
    for _, row in df.iterrows():
        lat, lon = clean_coord_pair(row.get("latitude"), row.get("longitude"))
        name = str(row["hospital_name"]).strip()
        base_slug = slugify(name)
        n = seen_slugs.get(base_slug, 0)
        seen_slugs[base_slug] = n + 1
        slug = base_slug if n == 0 else f"{base_slug}-{n + 1}"

        records.append({
            "id": str(row["hospital_id"]),
            "slug": slug,
            "name": name,
            "address": clean_str(row.get("address")),
            "city": city.title(),
            "state": state.title(),
            "pincode": clean_str(row.get("pincode")),
            "phone": clean_str(row.get("phone")),
            "emails": clean_str(row.get("emails")),
            "networkType": clean_str(row.get("network_type")),
            "bedCount": clean_str(row.get("bed_count")),
            "icuBeds": clean_str(row.get("icu_beds")),
            "rohiniCode": clean_str(row.get("rohini_code")),
            "lat": lat,
            "lon": lon,
            "totalDoctors": clean_str(row.get("total_doctors")),
            "totalNurses": clean_str(row.get("total_nurses")),
            "nabhFlag": clean_str(row.get("accreditation_certification")),
        })
    return records


def main():
    all_records = []
    stats = []
    for csv_path in sorted(SCRAP_DIR.glob("bajaj_hospitals_*_enriched.csv")):
        m = CITY_FILE_RE.search(csv_path.name)
        if not m:
            continue
        state, city = m.group(1), m.group(2)
        records = load_city_csv(csv_path, state, city)
        mapped = sum(1 for r in records if r["lat"] is not None)
        stats.append((city, len(records), mapped))
        all_records.extend(records)

    ids = [r["id"] for r in all_records]
    assert len(ids) == len(set(ids)), "duplicate hospital_id across cities"
    city_slugs = [(r["city"], r["slug"]) for r in all_records]
    assert len(city_slugs) == len(set(city_slugs)), "duplicate (city, slug) pair"

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "hospitals.json").write_text(
        json.dumps(all_records, ensure_ascii=False), encoding="utf-8"
    )

    cities = sorted({r["city"] for r in all_records})
    (OUT_DIR / "meta.json").write_text(
        json.dumps({
            "cities": cities,
            "total": len(all_records),
            "generatedFromRows": {c: t for c, t, _ in stats},
        }, indent=2),
        encoding="utf-8",
    )

    print(f"{len(all_records)} hospitals -> {OUT_DIR / 'hospitals.json'}")
    for city, total, mapped in stats:
        pct = mapped / total if total else 0
        print(f"  {city:12s} {total:4d} rows, {mapped:4d} mappable ({pct:.1%})")


if __name__ == "__main__":
    main()
