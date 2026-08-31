"""
CGHS reference rates — the government benchmark spine. No auth, no scope
issues: 18 calls covers the full tier x NABH x ward matrix.

Usage: python data-pipeline/sources/cghs.py
Output: data-pipeline/output/cghs_rates.json
"""

import json
from pathlib import Path

import requests

URL = "https://cghs.mohfw.gov.in/AHIMSG5/hislogin/getCghsRateListLgnFtr"
OUT_PATH = Path(__file__).resolve().parent.parent / "output" / "cghs_rates.json"

TIERS = ["tier_i", "tier_ii", "tier_iii"]
NABH = ["nabh", "non_nabh"]
WARDS = ["general_ward", "semi_private_ward", "private_ward"]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
}


def fetch(tier: str, nabh: str, ward: str) -> list[dict]:
    param = f"{tier}_{nabh}_{ward}"
    resp = requests.get(URL, params={"inputCol": param}, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    rows = data.get("rateListArray", [])
    out = []
    for row in rows:
        rate_key = next(
            (k for k in row if k not in (
                "s_no", "alphanumeric_code",
                "cghs_treatment_procedure_investigation_list",
                "speciality_classification",
            )),
            None,
        )
        out.append({
            "code": row.get("alphanumeric_code"),
            "name": row.get("cghs_treatment_procedure_investigation_list"),
            "specialty": row.get("speciality_classification"),
            "tier": tier,
            "nabh": nabh == "nabh",
            "ward": ward,
            "amount": row.get(rate_key) if rate_key else None,
        })
    return out


def main():
    all_rows = []
    for tier in TIERS:
        for nabh in NABH:
            for ward in WARDS:
                try:
                    rows = fetch(tier, nabh, ward)
                except Exception as e:
                    print(f"  {tier}/{nabh}/{ward} ERROR: {e}")
                    continue
                all_rows.extend(rows)
                print(f"  {tier}/{nabh}/{ward}: {len(rows)} rows")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(all_rows, ensure_ascii=False), encoding="utf-8")
    print(f"{len(all_rows)} total rows -> {OUT_PATH}")


if __name__ == "__main__":
    main()
