"""
Google Maps ratings, reviews and photos for Bangalore network hospitals, via a
third-party scraping vendor (Outscraper by default, Apify with --vendor apify).

WHY A VENDOR AND NOT THE OFFICIAL PLACES API
--------------------------------------------
Google's Places policy says "You must not pre-fetch, cache, or store Places API
content beyond the allowed exceptions": place IDs may be stored indefinitely,
but ratings, review text, photos and phone numbers must be fetched live and
rendered with attribution. This repo is a committed JSON snapshot pre-rendered
to static HTML on GitHub Pages, which is the opposite of that -- so the official
API cannot feed data/generated/.

Using a scraping vendor instead is a deliberate, documented trade-off: it
breaches Google's ToS, and review text is authored content whose republication
carries copyright exposure. The mitigations we DO apply live downstream in
build_reviews.py and components/HospitalReviews.tsx -- author attribution is
kept, every review links back to its source on Google Maps, photos are hotlinked
and never re-hosted, and a fetch date is shown per hospital.

Usage:
    export OUTSCRAPER_API_KEY=...            # or APIFY_TOKEN with --vendor apify
    python data-pipeline/sources/google_reviews.py --limit 10   # smoke test FIRST
    python data-pipeline/sources/google_reviews.py              # full 362-row run

Output:
    data-pipeline/output/google_reviews_bangalore.json          (normalised)
    data-pipeline/output/google_reviews_bangalore_cache.jsonl   (resume cache)
    data-pipeline/output/google_reviews_bangalore_errors.jsonl  (retryable misses)

Run the --limit 10 smoke test before the full run and eyeball the normalised
output: vendor response field names drift, and _pick() below is deliberately
tolerant rather than betting on one exact schema.
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ROOT = Path(__file__).resolve().parent.parent.parent
OUT_DIR = Path(__file__).resolve().parent.parent / "output"
HOSPITALS = ROOT / "data" / "generated" / "hospitals.json"

CITY = "Bangalore"
REVIEWS_PER_HOSPITAL = 10

OUTSCRAPER_URL = "https://api.app.outscraper.com/maps/reviews-v3"
APIFY_URL = (
    "https://api.apify.com/v2/acts/compass~google-maps-reviews-scraper"
    "/run-sync-get-dataset-items"
)


def make_session() -> requests.Session:
    """A pooled session with real backoff.

    scrap/enrich_hospital_quality.py opens a fresh connection per call and has no
    retry at all; any scraping vendor will return 429 somewhere in a 362-row run,
    so both gaps are closed here.
    """
    session = requests.Session()
    retry = Retry(
        total=5,
        backoff_factor=2,  # 2s, 4s, 8s, 16s, 32s
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET", "POST"),
        respect_retry_after_header=True,
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=4, pool_maxsize=4)
    session.mount("https://", adapter)
    return session


def _pick(obj: dict, *keys, default=None):
    """First present, non-empty key wins -- vendors rename fields between versions."""
    for k in keys:
        v = obj.get(k)
        if v not in (None, "", [], {}):
            return v
    return default


def _to_float(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _to_int(v):
    try:
        return int(str(v).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def build_query(hospital: dict) -> str:
    """Name + city + pincode.

    The pincode disambiguates branches of the same chain far better than the
    free-text address, which is dirty enough to contain embedded newlines.
    """
    parts = [hospital["name"], CITY]
    if hospital.get("pincode"):
        parts.append(str(hospital["pincode"]))
    return ", ".join(parts)


def normalise_place(place: dict) -> dict:
    """Vendor row -> our shape. Everything nullable; build_reviews.py decides trust."""
    raw_reviews = _pick(place, "reviews_data", "reviews", "reviewsData", default=[]) or []
    if not isinstance(raw_reviews, list):
        raw_reviews = []

    reviews = []
    for r in raw_reviews[:REVIEWS_PER_HOSPITAL]:
        if not isinstance(r, dict):
            continue
        text = _pick(r, "review_text", "text", "snippet", "reviewText")
        if not text:
            continue  # ratings-only rows carry nothing to show
        reviews.append(
            {
                "author": _pick(
                    r, "author_title", "name", "reviewerName", default="Google user"
                ),
                "rating": _to_float(_pick(r, "review_rating", "rating", "stars")),
                "text": str(text).strip(),
                "publishedAt": _pick(
                    r, "review_datetime_utc", "publishedAtDate",
                    "relative_time_description",
                ),
                "profileUrl": _pick(r, "author_link", "reviewerUrl", "authorUrl"),
                "avatarUrl": _pick(r, "author_image", "reviewerPhotoUrl", "authorPhoto"),
                "reviewUrl": _pick(r, "review_link", "reviewUrl"),
            }
        )

    photos = _pick(place, "photos_sample", "photos", "imageUrls", default=[]) or []
    photo_urls = []
    for p in photos[:8]:
        url = p.get("photo_url") if isinstance(p, dict) else p
        if isinstance(url, str) and url.startswith("http"):
            photo_urls.append(url)

    return {
        "googleName": _pick(place, "name", "title"),
        "googleAddress": _pick(place, "full_address", "address", "formattedAddress"),
        "lat": _to_float(_pick(place, "latitude", "lat")),
        "lon": _to_float(_pick(place, "longitude", "lng", "lon")),
        "rating": _to_float(_pick(place, "rating", "totalScore")),
        "reviewCount": _to_int(
            _pick(place, "reviews", "reviewsCount", "user_ratings_total")
        ),
        "phone": _pick(place, "phone", "phoneUnformatted", "phone_number"),
        "placeId": _pick(place, "place_id", "placeId"),
        "googleMapsUrl": _pick(place, "location_link", "url", "googleMapsUrl"),
        "photos": photo_urls,
        "reviews": reviews,
    }


def fetch_outscraper(session: requests.Session, query: str, api_key: str):
    resp = session.get(
        OUTSCRAPER_URL,
        params={
            "query": query,
            "reviewsLimit": REVIEWS_PER_HOSPITAL,
            "limit": 1,
            "sort": "most_relevant",
            "language": "en",
            "region": "IN",
            "async": "false",
        },
        headers={"X-API-KEY": api_key},
        timeout=180,
    )
    resp.raise_for_status()
    rows = resp.json().get("data") or []
    if rows and isinstance(rows[0], list):
        rows = rows[0]  # reviews-v3 nests one list per query
    return rows[0] if rows else None


def fetch_apify(session: requests.Session, query: str, token: str):
    resp = session.post(
        APIFY_URL,
        params={"token": token},
        json={
            "searchStringsArray": [query],
            "maxReviews": REVIEWS_PER_HOSPITAL,
            "maxCrawledPlacesPerSearch": 1,
            "language": "en",
            "reviewsSort": "mostRelevant",
        },
        timeout=300,
    )
    resp.raise_for_status()
    rows = resp.json()
    return rows[0] if rows else None


VENDORS = {
    "outscraper": (fetch_outscraper, "OUTSCRAPER_API_KEY"),
    "apify": (fetch_apify, "APIFY_TOKEN"),
}


def load_cache(path: Path) -> dict:
    cache = {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                rec = json.loads(line)
                cache[rec["hospitalId"]] = rec
    except FileNotFoundError:
        pass
    return cache


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vendor", choices=sorted(VENDORS), default="outscraper")
    ap.add_argument("--limit", type=int, help="only fetch the first N uncached hospitals")
    ap.add_argument("--sleep", type=float, default=0.5)
    args = ap.parse_args()

    fetch, key_env = VENDORS[args.vendor]
    api_key = os.environ.get(key_env)
    if not api_key:
        sys.exit(f"{key_env} is not set -- export it before running.")

    hospitals = [
        h
        for h in json.loads(HOSPITALS.read_text(encoding="utf-8"))
        if h["city"] == CITY
    ]
    print(f"{len(hospitals)} {CITY} hospitals")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = OUT_DIR / "google_reviews_bangalore_cache.jsonl"
    error_path = OUT_DIR / "google_reviews_bangalore_errors.jsonl"
    out_path = OUT_DIR / "google_reviews_bangalore.json"

    cache = load_cache(cache_path)
    print(f"resuming with {len(cache)} cached" if cache else "starting fresh")

    todo = [h for h in hospitals if h["id"] not in cache]
    if args.limit:
        todo = todo[: args.limit]
    print(f"{len(todo)} to fetch")

    session = make_session()
    errors = 0
    # Successes only go in the cache. scrap/enrich_hospital_quality.py writes a
    # {found: false} record on any exception, which permanently negative-caches a
    # transient network blip; here a failure lands in errors.jsonl instead and is
    # picked up again by the next run.
    with open(cache_path, "a", encoding="utf-8") as cache_file, open(
        error_path, "a", encoding="utf-8"
    ) as error_file:
        for i, h in enumerate(todo, start=1):
            query = build_query(h)
            try:
                place = fetch(session, query, api_key)
            except Exception as e:
                errors += 1
                error_file.write(
                    json.dumps(
                        {"hospitalId": h["id"], "query": query, "error": str(e)},
                        ensure_ascii=False,
                    )
                    + "\n"
                )
                error_file.flush()
                print(f"  [{i}/{len(todo)}] {h['name'][:45]} ERROR: {e}")
                time.sleep(args.sleep)
                continue

            rec = {
                "hospitalId": h["id"],
                "hospitalSlug": h["slug"],
                "hospitalName": h["name"],
                "query": query,
                "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "found": place is not None,
                "place": normalise_place(place) if place else None,
            }
            cache[h["id"]] = rec
            cache_file.write(json.dumps(rec, ensure_ascii=False) + "\n")
            cache_file.flush()
            time.sleep(args.sleep)
            if i % 10 == 0 or i == len(todo):
                print(f"  [{i}/{len(todo)}] done")

    records = [cache[h["id"]] for h in hospitals if h["id"] in cache]
    out_path.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")

    found = sum(1 for r in records if r["found"])
    with_reviews = sum(1 for r in records if r["found"] and r["place"]["reviews"])
    print(f"\n{len(records)}/{len(hospitals)} fetched -> {out_path}")
    print(f"  {found} returned a place, {with_reviews} with at least one review")
    if errors:
        print(f"  {errors} errors -> {error_path} (re-run to retry them)")


if __name__ == "__main__":
    main()
