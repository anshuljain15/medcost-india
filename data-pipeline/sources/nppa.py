"""
Loads NPPA's consolidated ceiling-price export into
data-pipeline/output/nppa_ceilings.json.

Manual download from nppaindia.nic.in ("All Drugs Ceiling Prices.xlsx"). Each
row is one NLEM formulation with the S.O. (gazette notification) that fixed its
ceiling. The price is per unit (1 tablet, 1 ml, each vial) and EXCLUDES GST --
the UI must say so, or the ceiling looks lower than what a counter can charge.

Usage: python data-pipeline/sources/nppa.py [raw_dir]
"""

import json
import re
import sys
import warnings
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent.parent
OUT = Path(__file__).resolve().parent.parent / "output"

# '&#8377 6.36(1 Tablet)' -> 6.36, '1 Tablet'
PRICE_RE = re.compile(r"([\d.]+)\s*\((.*)\)\s*$")


def main():
    raw = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "medcost_fairprice"
    path = raw / "All Drugs Ceiling Prices.xlsx"
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")  # "Workbook contains no default style"
        ws = openpyxl.load_workbook(path).active

    export_date = None
    rows = []
    for r in ws.iter_rows(values_only=True):
        first = r[0]
        if isinstance(first, str) and first.startswith("Date:"):
            m = re.search(r"(\d{2})/(\d{2})/(\d{4})", first)
            export_date = f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else None
        if not isinstance(first, (int, float)):
            continue
        _, nlem, formulation, dosage, so_number, so_date, price = r[:7]
        m = PRICE_RE.search(str(price).replace("&#8377", ""))
        rows.append({
            "nlemVersion": int(nlem) if nlem else None,
            "formulation": " ".join(str(formulation).split()),
            "dosage": " ".join(str(dosage).split()),
            "soNumber": str(so_number).strip(),
            "soDate": str(so_date).strip(),
            "ceilingPrice": float(m.group(1)) if m else None,
            "ceilingUnit": m.group(2).strip() if m else None,
        })

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "nppa_ceilings.json").write_text(
        json.dumps({"sourceFile": path.name, "exportDate": export_date, "rows": rows}, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"{len(rows)} NPPA ceiling rows (export {export_date}) -> nppa_ceilings.json")


if __name__ == "__main__":
    main()
