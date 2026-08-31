"""
Combines the CGHS government reference rates and the HexaHealth
hospital-wise market estimates into the two JSON files the site reads:

  data/generated/procedures.json     — one entry per HexaHealth procedure,
                                        with its market range, per-hospital
                                        prices (linked to our hospital
                                        directory where a confident name
                                        match exists), and a best-effort
                                        CGHS reference match.
  data/generated/cghs_rates.json     — the full CGHS Tier I rate list
                                        (Bangalore is Tier I), for the
                                        standalone rate-explorer table.

No payer/insurance-plan dimension anywhere — India pricing here is just
procedure -> rate, unlike the US where the same code has a different
negotiated rate per payer.
"""

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "generated"
PIPE_OUT = Path(__file__).resolve().parent / "output"

# Hospital-name matching must be precision-first: a wrong match links a real
# price quote to the wrong physical branch (chains like Manipal/Apollo/Aster/
# Sakra/Sparsh have many Bangalore branches), which is a real factual error,
# not a cosmetic one. So this strips only structural noise words and then
# requires the token SETS to be exactly equal — never a subset, never a
# similarity score — so "Manipal, Old Airport Road" can never match
# "Manipal, Sarjapur" just because they share the brand token.
HOSPITAL_STOPWORDS = {
    "hospital", "hospitals", "medical", "center", "centre", "the", "and",
    "bangalore", "bengaluru", "pvt", "ltd", "private", "limited",
}

# Procedure-name matching can safely be looser: CGHS descriptions are long
# and formal ("Total Hip Replacement (THR)") while our names are short
# consumer terms ("Total Hip Replacement"), so we require every meaningful
# token from the shorter name to appear in the other (a subset check), never
# a character-similarity ratio — that's what previously matched
# "Angioplasty" to "Vaginoplasty" at 0.87 by pure letter overlap.
PROCEDURE_STOPWORDS = {
    "surgery", "treatment", "procedure", "test", "operation", "the", "and",
    "for", "of", "in",
}


def strip_punct(name: str) -> str:
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    name = name.lower()
    return re.sub(r"[^a-z0-9\s]", " ", name)


def tokenize(name: str, stopwords: set[str]) -> frozenset[str]:
    return frozenset(t for t in strip_punct(name).split() if t and t not in stopwords)


def stem(token: str) -> str:
    # collapses noun forms like "transplantation" -> "transplant" so a
    # query and a CGHS row don't fail to match on a pure suffix difference
    if token.endswith("ation") and len(token) > 8:
        return token[:-5]
    return token


def tokenize_stemmed(name: str, stopwords: set[str]) -> frozenset[str]:
    return frozenset(stem(t) for t in tokenize(name, stopwords))


# Known false positives from the token-subset heuristic: the CGHS row
# contains the query word only inside an unrelated qualifying phrase, not
# as the actual procedure. Verified by hand against the full CGHS list.
CGHS_QUERY_BLOCKLIST = {
    "abortion",  # only CGHS row containing this word is a post-abortion
                 # sterilization procedure, not abortion itself
}


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()


def build_hospital_index(hospitals: list[dict]) -> dict[frozenset, dict]:
    index: dict[frozenset, dict] = {}
    for h in hospitals:
        if h["city"] != "Bangalore":
            continue
        tokens = tokenize(h["name"], HOSPITAL_STOPWORDS)
        # a name whose token set collides with another hospital's is
        # ambiguous either way — drop both rather than guess
        index[tokens] = None if tokens in index else h
    return index


def match_hospital(name: str, index: dict[frozenset, dict]) -> dict | None:
    tokens = tokenize(name, HOSPITAL_STOPWORDS)
    if len(tokens) < 2:
        return None
    return index.get(tokens)


def match_cghs(procedure_name: str, cghs_rows: list[dict]) -> dict | None:
    query = tokenize_stemmed(procedure_name, PROCEDURE_STOPWORDS)
    if not query or query & CGHS_QUERY_BLOCKLIST:
        return None
    tier1_nabh_general = [
        r for r in cghs_rows
        if r["tier"] == "tier_i" and r["nabh"] and r["ward"] == "general_ward"
    ]
    candidates = []
    for row in tier1_nabh_general:
        row_tokens = tokenize_stemmed(row["name"], PROCEDURE_STOPWORDS)
        if not row_tokens:
            continue
        smaller, larger = (query, row_tokens) if len(query) <= len(row_tokens) else (row_tokens, query)
        if len(smaller) == 1 and next(iter(smaller)) not in larger:
            continue
        if smaller.issubset(larger):
            candidates.append((abs(len(query) - len(row_tokens)), row))
    if not candidates:
        return None
    if len(query) == 1 and len(candidates) > 1:
        # a single generic word (e.g. "Angioplasty") matching several CGHS
        # rows that are clinically distinct (coronary vs peripheral vs
        # renal) is genuinely ambiguous — picking the shortest name has
        # twice picked the clinically wrong one, so don't guess
        return None
    candidates.sort(key=lambda c: c[0])
    return candidates[0][1]


def parse_money(v):
    if v is None:
        return None
    return int(re.sub(r"[^\d]", "", v)) if re.search(r"\d", v) else None


def main():
    hospitals = json.loads((OUT_DIR / "hospitals.json").read_text(encoding="utf-8"))
    hospital_index = build_hospital_index(hospitals)

    cghs_rows = json.loads((PIPE_OUT / "cghs_rates.json").read_text(encoding="utf-8"))
    hexa_pages = json.loads((PIPE_OUT / "hexahealth_bangalore.json").read_text(encoding="utf-8"))

    # One row per (code, nabh) with all three ward prices, instead of one
    # row per (code, nabh, ward) — a third the size, and a more useful
    # shape for the rate-explorer table (no ward filter needed).
    merged: dict[tuple[str, bool], dict] = {}
    for r in cghs_rows:
        if r["tier"] != "tier_i":
            continue
        key = (r["code"], r["nabh"])
        entry = merged.setdefault(key, {
            "code": r["code"],
            "name": r["name"],
            "specialty": r["specialty"],
            "nabh": r["nabh"],
            "generalWard": None,
            "semiPrivateWard": None,
            "privateWard": None,
        })
        field = {
            "general_ward": "generalWard",
            "semi_private_ward": "semiPrivateWard",
            "private_ward": "privateWard",
        }[r["ward"]]
        entry[field] = r["amount"]

    procedures = []
    matched_hospitals = 0
    total_hospital_rows = 0
    matched_cghs = 0

    for page in hexa_pages:
        if page["cityLow"] is None and not page["hospitals"]:
            continue

        hospital_prices = []
        for h in page["hospitals"]:
            total_hospital_rows += 1
            match = match_hospital(h["name"], hospital_index)
            if match:
                matched_hospitals += 1
            hospital_prices.append({
                "hospitalName": h["name"],
                "hospitalSlug": match["slug"] if match else None,
                "min": h["min"],
                "max": h["max"],
                "avg": h["avg"],
            })
        hospital_prices.sort(key=lambda h: (h["avg"] if h["avg"] is not None else 1e18))

        cghs_match_raw = match_cghs(page["procedureName"], cghs_rows)
        cghs_match = merged.get((cghs_match_raw["code"], cghs_match_raw["nabh"])) if cghs_match_raw else None
        if cghs_match:
            matched_cghs += 1

        procedures.append({
            "slug": slugify(page["procedureName"]),
            "name": page["procedureName"],
            "cityLow": parse_money(page["cityLow"]),
            "cityHigh": parse_money(page["cityHigh"]),
            "hospitalPrices": hospital_prices,
            "cghsReference": cghs_match,
            "source": "hexahealth",
            "sourceUrl": page["url"],
        })

    procedures.sort(key=lambda p: p["name"])

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "procedures.json").write_text(
        json.dumps(procedures, ensure_ascii=False), encoding="utf-8"
    )

    tier1_merged = sorted(merged.values(), key=lambda r: (r["code"], not r["nabh"]))
    (OUT_DIR / "cghs_rates.json").write_text(
        json.dumps(tier1_merged, ensure_ascii=False), encoding="utf-8"
    )

    print(f"{len(procedures)} procedures -> procedures.json")
    print(f"  {total_hospital_rows} hospital price rows, {matched_hospitals} matched to a directory hospital")
    print(f"  {matched_cghs}/{len(procedures)} procedures matched to a CGHS reference row")
    print(f"{len(tier1_merged)} Tier I CGHS rows -> cghs_rates.json")


if __name__ == "__main__":
    main()
