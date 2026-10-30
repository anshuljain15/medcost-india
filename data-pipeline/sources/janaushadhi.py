"""
Loads the two PMBJP (Jan Aushadhi) exports into data-pipeline/output/:

  janaushadhi_products.json  -- the product basket: drug code, generic name,
                                unit size, MRP, therapeutic group
  janaushadhi_kendras.json   -- the store list: kendra code, address,
                                district, state, PIN

Both are MANUAL downloads from janaushadhi.gov.in -- the site is a JS app with
no documented API, so we take its own export buttons rather than reverse-
engineering its XHRs:

  Product -> Product List          -> "Product List_<date>.csv"
  Kendra  -> List of Kendra, per state (choose a state BEFORE exporting, or
             the PDF comes back with only the title)  -> kendra_list/*.pdf

The store PDF's "Name" column is the operator's personal name. We drop it:
a patient needs the address, not the name of a private individual.

Usage: python data-pipeline/sources/janaushadhi.py [raw_dir]
       raw_dir defaults to <repo>/medcost_fairprice (gitignored)
"""

import csv
import json
import re
import sys
from datetime import datetime
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parent.parent.parent
OUT = Path(__file__).resolve().parent.parent / "output"


def snapshot_date(path: Path) -> str:
    # exports are named "<title>_30_10_2026 @ 10_46_50.<ext>"
    m = re.search(r"_(\d{1,2})_(\d{1,2})_(\d{4}) @", path.name)
    if not m:
        return datetime.fromtimestamp(path.stat().st_mtime).date().isoformat()
    d, mth, y = (int(x) for x in m.groups())
    return f"{y:04d}-{mth:02d}-{d:02d}"


def load_products(raw: Path) -> dict:
    files = sorted(raw.glob("Product List_*.csv"))
    if not files:
        sys.exit(f"no 'Product List_*.csv' in {raw}")
    path = files[-1]
    rows = []
    with path.open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            mrp = float(r["MRP"]) if re.fullmatch(r"\d+(\.\d+)?", r["MRP"].strip()) else None
            rows.append({
                "drugCode": r["Drug Code"].strip(),
                "name": " ".join(r["Generic Name"].split()),
                "unitSize": r["Unit Size"].strip(),
                # 345 rows carry MRP "0": that is "no price published", not free
                "mrp": mrp if mrp else None,
                "group": r["Group Name"].strip(),
            })
    return {"sourceFile": path.name, "snapshotDate": snapshot_date(path), "products": rows}


def load_kendras(raw: Path) -> dict:
    files = sorted((raw / "kendra_list").glob("*.pdf"))
    by_code: dict[str, dict] = {}
    dates = set()
    for path in files:
        dates.add(snapshot_date(path))
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                for table in page.extract_tables():
                    for row in table:
                        cells = [" ".join((c or "").split()) for c in row]
                        # header and wrapped-continuation rows have no serial number
                        if len(cells) != 7 or not cells[0].isdigit():
                            continue
                        _, code, _operator_name, state, district, pin, address = cells
                        if not re.fullmatch(r"PMBJK\d+", code):
                            continue
                        # the same state exported twice yields the same codes
                        by_code[code] = {
                            "code": code,
                            "address": address or None,
                            "district": district or None,
                            "state": state,
                            "pincode": pin if re.fullmatch(r"[1-9]\d{5}", pin) else None,
                        }
    kendras = sorted(by_code.values(), key=lambda k: k["code"])
    return {
        "sourceFiles": len(files),
        "snapshotDate": max(dates) if dates else None,
        "kendras": kendras,
    }


def main():
    raw = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "medcost_fairprice"
    OUT.mkdir(parents=True, exist_ok=True)

    products = load_products(raw)
    (OUT / "janaushadhi_products.json").write_text(json.dumps(products, ensure_ascii=False), encoding="utf-8")
    priced = sum(1 for p in products["products"] if p["mrp"])
    print(f"{len(products['products'])} products ({priced} with an MRP) -> janaushadhi_products.json")

    kendras = load_kendras(raw)
    (OUT / "janaushadhi_kendras.json").write_text(json.dumps(kendras, ensure_ascii=False), encoding="utf-8")
    states = {k["state"] for k in kendras["kendras"]}
    no_pin = sum(1 for k in kendras["kendras"] if not k["pincode"])
    print(f"{len(kendras['kendras'])} kendras in {len(states)} states/UTs "
          f"({no_pin} without a valid PIN) from {kendras['sourceFiles']} PDFs -> janaushadhi_kendras.json")


if __name__ == "__main__":
    main()
