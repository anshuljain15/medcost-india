"""
Matches scraped Google places to our hospital directory and writes the file the
site reads:

  data/generated/reviews.json  -- keyed by hospital slug: rating, review count,
                                  top reviews, photos, and the Google Maps link.

MATCHING: NAME **AND** LOCATION, BOTH REQUIRED
----------------------------------------------
A wrong match attaches a real patient's 2-star review to a hospital that did not
earn it -- a factual claim about a real business, the same class of error the
price matcher in build_procedures.py is built to avoid. So a candidate is
accepted only when the name token sets are EXACTLY equal *and* the coordinates
agree to within MAX_DISTANCE_M.

The tokenizer and stopword list are imported from build_procedures.py rather
than re-implemented, but that module's "at least 2 tokens" guard is deliberately
NOT carried over -- see name_matches() for why it would silently drop 21.5% of
Bangalore.

Location is what makes the name rule safe here. build_procedures.py has to
*discard* hospitals whose name tokens collide with another's -- HexaHealth gives
it a bare name, so two Manipal branches are indistinguishable. We query per
hospital and get coordinates back, so distance separates them and the 19
Bangalore hospitals in colliding name groups (Chaitanya x2, HCG x3, Iswarya x2,
...) stay in instead of being dropped.

The one case location cannot fix is two of our hospitals resolving to the SAME
Google place. That is genuine ambiguity, so both are dropped -- the same call
build_hospital_index makes on a colliding token set.

Usage: python data-pipeline/build_reviews.py
"""

import json
import math
from pathlib import Path

# Reuse the price matcher's tokenizer. Two tokenizers would drift apart, and the
# stopword list encodes hard-won decisions about Indian hospital naming.
from build_procedures import HOSPITAL_STOPWORDS, tokenize

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "generated"
PIPE_OUT = Path(__file__).resolve().parent / "output"

CITY = "Bangalore"

# 150 m: tight enough that two branches of a chain never collide (the closest
# pair of same-name Bangalore hospitals in our data is kilometres apart), loose
# enough to absorb the difference between a Bajaj-supplied pin and Google's.
MAX_DISTANCE_M = 150.0

TOP_REVIEWS = 6


def haversine_m(lat1, lon1, lat2, lon2) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def name_matches(ours: str, theirs: str | None) -> bool:
    if not theirs:
        return False
    a = tokenize(ours, HOSPITAL_STOPWORDS)
    b = tokenize(theirs, HOSPITAL_STOPWORDS)
    # Deliberately NOT match_hospital's "at least 2 tokens" rule. That guard
    # exists because HexaHealth supplies a bare name with no location, so a lone
    # "apollo" identifies nothing. Here the caller also requires a coordinate
    # match, and 78 of 362 Bangalore hospitals (21.5%) are a single brand word
    # plus "hospital" -- "ZYMUS HOSPITAL" -> {zymus}. Requiring 2 tokens drops
    # every one of them silently. Exact set equality still rejects the dangerous
    # case: {apollo} != {apollo, cradle}.
    if not a or not b:
        return False
    return a == b


def location_matches(hospital: dict, place: dict) -> tuple[bool, str]:
    h_lat, h_lon = hospital.get("lat"), hospital.get("lon")
    p_lat, p_lon = place.get("lat"), place.get("lon")

    if None not in (h_lat, h_lon, p_lat, p_lon):
        d = haversine_m(h_lat, h_lon, p_lat, p_lon)
        return d <= MAX_DISTANCE_M, f"{d:.0f}m"

    # 2 of 362 Bangalore rows have no coordinates; all 362 have a pincode.
    pincode = hospital.get("pincode")
    address = place.get("googleAddress") or ""
    if pincode and str(pincode) in address:
        return True, f"pincode {pincode}"
    return False, "no coords, no pincode in address"


def main():
    hospitals = {
        h["slug"]: h
        for h in json.loads((OUT_DIR / "hospitals.json").read_text(encoding="utf-8"))
        if h["city"] == CITY
    }
    scraped = json.loads(
        (PIPE_OUT / "google_reviews_bangalore.json").read_text(encoding="utf-8")
    )

    accepted: dict[str, dict] = {}
    rejected_name = 0
    rejected_location = 0
    not_found = 0

    for rec in scraped:
        slug = rec["hospitalSlug"]
        hospital = hospitals.get(slug)
        if hospital is None:
            continue
        if not rec.get("found") or not rec.get("place"):
            not_found += 1
            continue

        place = rec["place"]
        if not name_matches(hospital["name"], place.get("googleName")):
            rejected_name += 1
            continue
        ok, why = location_matches(hospital, place)
        if not ok:
            rejected_location += 1
            continue

        reviews = [r for r in place.get("reviews", []) if r.get("text")]
        reviews.sort(key=lambda r: (r.get("rating") is None, -(r.get("rating") or 0)))

        accepted[slug] = {
            "hospitalSlug": slug,
            "rating": place.get("rating"),
            "reviewCount": place.get("reviewCount"),
            "placeId": place.get("placeId"),
            "googleMapsUrl": place.get("googleMapsUrl"),
            "photos": place.get("photos", []),
            "topReviews": reviews[:TOP_REVIEWS],
            "summary": None,
            "summaryModel": None,
            "fetchedAt": rec.get("fetchedAt"),
            "_matchedOn": why,
        }

    # Two of our hospitals resolving to one Google place is real ambiguity.
    # Drop every claimant rather than guess which branch owns the reviews.
    by_place: dict[str, list[str]] = {}
    for slug, entry in accepted.items():
        if entry["placeId"]:
            by_place.setdefault(entry["placeId"], []).append(slug)
    dropped_dupes = 0
    for place_id, slugs in by_place.items():
        if len(slugs) > 1:
            for slug in slugs:
                del accepted[slug]
                dropped_dupes += 1
            print(f"  ambiguous: {len(slugs)} hospitals -> one place ({place_id}): {', '.join(slugs)}")

    for entry in accepted.values():
        entry.pop("_matchedOn", None)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "reviews.json").write_text(
        json.dumps(accepted, ensure_ascii=False), encoding="utf-8"
    )

    total = len(hospitals)
    with_reviews = sum(1 for e in accepted.values() if e["topReviews"])
    print(f"\n{len(accepted)}/{total} {CITY} hospitals matched -> reviews.json")
    print(f"  {with_reviews} of those have at least one review to show")
    print(f"  rejected: {rejected_name} on name, {rejected_location} on location")
    print(f"  {not_found} returned no place, {dropped_dupes} dropped as ambiguous")
    print("\nA jump in the matched count means the matcher got looser, not better.")


if __name__ == "__main__":
    main()
