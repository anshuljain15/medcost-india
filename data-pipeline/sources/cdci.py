"""
Loads the substance vocabulary from NRCeS "Common Drug Codes for India" (CDCI)
into data-pipeline/output/cdci_substances.json.

CDCI is the C-DAC / MoHFW drug master (CC BY 4.0; redistribution permitted
within India -- see License.txt in the package). build_medicines.py uses its
~3.3k substance names as a VOCABULARY GATE: a salt parsed out of a product name
is only trusted if it normalises to a CDCI substance (or an explicit alias).
That catches typos and parse debris ("magnessium", "spore") that would
otherwise become a fake salt and form a bogus group.

Manual download: nrces.in -> National Releases -> CDCI Flat Files Package.

Usage: python data-pipeline/sources/cdci.py [raw_dir]
"""

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
OUT = Path(__file__).resolve().parent.parent / "output"


def main():
    raw = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "medcost_fairprice"
    path = raw / "CommonDrugCodesForIndia_FlatFilePackage" / "SubstanceMaster.txt"
    names = set()
    with path.open(encoding="utf-8", errors="replace", newline="") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            name = (r.get("Substance Name") or "").strip()
            if name:
                names.add(name)

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "cdci_substances.json").write_text(
        json.dumps(sorted(names), ensure_ascii=False), encoding="utf-8"
    )
    print(f"{len(names)} CDCI substance names -> cdci_substances.json")


if __name__ == "__main__":
    main()
