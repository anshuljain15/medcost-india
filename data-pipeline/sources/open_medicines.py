"""
Loads the brand-price layer into data-pipeline/output/open_medicines.json.

SOURCE AND ITS LIMITS -- read before relying on these prices
------------------------------------------------------------
"A-Z Medicine Dataset of India" (Kaggle, shudhanshusingh), CC BY-SA 4.0.
https://www.kaggle.com/datasets/shudhanshusingh/az-medicine-dataset-of-india

- It is a SNAPSHOT from November 2022. Prices render with that date, never as
  current. Jan Aushadhi and NPPA prices carry their own (newer) dates.
- CC BY-SA 4.0 is share-alike: the medicine files we derive from it are
  CC BY-SA 4.0 too, and must be credited on the site. The app code is not.
- The uploader appears to have collected it from online pharmacies, so the
  licence is theirs to answer for, not a guarantee from the pharmacies.
- It keeps AT MOST TWO salts per brand. A 3-salt brand is cut to its first two
  (Zerodol-SP -- aceclofenac + paracetamol + serratiopeptidase -- reads exactly
  like Zerodol-P). The tell is a trailing space on short_composition2; those
  rows are flagged `truncated` and build_medicines.py never groups them.

Only tablets and capsules are kept, and discontinued rows are dropped.

Usage: python data-pipeline/sources/open_medicines.py [raw_dir]
"""

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
OUT = Path(__file__).resolve().parent.parent / "output"

DATASET = {
    "name": "A-Z Medicine Dataset of India",
    "url": "https://www.kaggle.com/datasets/shudhanshusingh/az-medicine-dataset-of-india",
    "license": "CC BY-SA 4.0",
    "snapshotDate": "2022-11",
}


def main():
    raw = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "medcost_fairprice"
    path = raw / "A_Z_medicines_dataset_of_India.csv"

    rows = []
    total = discontinued = other_form = 0
    with path.open(encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            total += 1
            if r["Is_discontinued"].strip().upper() == "TRUE":
                discontinued += 1
                continue
            label = f'{r["name"]} {r["pack_size_label"]}'.lower()
            if "tablet" not in label and "capsule" not in label:
                other_form += 1
                continue
            comp2 = r["short_composition2"]
            try:
                price = float(r["price(₹)"])
            except ValueError:
                price = None
            rows.append({
                "id": r["id"],
                "name": " ".join(r["name"].split()),
                "manufacturer": r["manufacturer_name"].strip() or None,
                "packLabel": r["pack_size_label"].strip(),
                "price": price if price else None,
                "compositions": [c.strip() for c in (r["short_composition1"], comp2) if c.strip()],
                "truncated": comp2 != comp2.rstrip(),
            })

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "open_medicines.json").write_text(
        json.dumps({**DATASET, "rows": rows}, ensure_ascii=False), encoding="utf-8"
    )
    truncated = sum(r["truncated"] for r in rows)
    print(f"{total} rows: {discontinued} discontinued, {other_form} not tablet/capsule")
    print(f"{len(rows)} tablet/capsule brands kept ({truncated} flagged truncated) -> open_medicines.json")


if __name__ == "__main__":
    main()
