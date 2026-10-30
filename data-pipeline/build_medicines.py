"""
Groups medicines by exact composition and writes what the site reads:

  data/generated/medicines.json   -- one entry per medicine group (same salts,
                                     strengths, form, release): Jan Aushadhi
                                     products, NPPA ceiling, cheapest brands,
                                     related groups. Read server-side only.
  data/generated/kendras.json     -- every Jan Aushadhi Kendra, for the
                                     hospital page's "stores near here" slice.
  public/data/medicines/search/q-<abc>.json
  public/data/kendras/<pin3>.json -- small shards the browser fetches on
                                     demand, so neither dataset lands in a
                                     JS bundle (see CLAUDE.md, hospitals.json).

Inputs are the four loaders in sources/ (janaushadhi, nppa, open_medicines,
cdci). Composition parsing and every matching decision live in
medicine_parse.py -- read its docstring first.

SCOPE (v1): only groups that have a Jan Aushadhi product or an NPPA ceiling.
That is the set where we can show a citable cheaper option; it also keeps the
static export to a few thousand pages. A brand outside that set is not
searchable yet -- coverage, not a wrong answer.

LICENCES: brand prices come from a CC BY-SA 4.0 dataset, so medicines.json and
the search shards are CC BY-SA 4.0 and the site credits it. CDCI (CC BY 4.0)
is used only as a vocabulary and is not republished.

Usage: python data-pipeline/build_medicines.py
"""

import json
import re
import shutil
import statistics
from collections import defaultdict
from pathlib import Path

from build_procedures import slugify
from medicine_parse import (
    build_vocab, ja_units, nppa_unit_ok, open_units, parse_ja, parse_nppa, parse_open,
)

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "generated"
PUBLIC_DIR = ROOT / "public" / "data"
PIPE_OUT = Path(__file__).resolve().parent / "output"

# Cheapest brands stored per group. Pantoprazole 40 mg alone has ~2,600 brands;
# the page shows the cheapest and the count, and the search result for any one
# brand carries that brand's own price.
MAX_BRANDS_PER_GROUP = 60
MAX_RELATED = 8


def load(name):
    return json.loads((PIPE_OUT / name).read_text(encoding="utf-8"))


def fmt_strength(s: str) -> str:
    m = re.fullmatch(r"([\d.]+)(mg|iu)", s)
    v, unit = float(m.group(1)), m.group(2)
    if unit == "mg" and v < 1:
        return f"{round(v * 1000, 2):g} mcg"
    return f"{v:g} {'IU' if unit == 'iu' else 'mg'}"


def title_case(salt: str) -> str:
    return " ".join(w[:1].upper() + w[1:] for w in salt.split())


def group_title(pairs) -> str:
    return " + ".join(f"{title_case(s)} {fmt_strength(st)}" for s, st in pairs)


def group_slug(key) -> str:
    form, release, pairs = key
    parts = [f"{s}-{st}" for s, st in pairs] + [form]
    if release != "standard":
        parts.append(release)
    return slugify(" ".join(parts))


def per_unit(price, units):
    return round(price / units, 2) if price and units else None


def shard_key(text: str) -> str | None:
    k = re.sub(r"[^a-z0-9]", "", text.lower())[:3]
    return k if len(k) == 3 else None


def main():
    vocab = build_vocab(load("cdci_substances.json"))
    ja = load("janaushadhi_products.json")
    nppa = load("nppa_ceilings.json")
    open_ds = load("open_medicines.json")
    kendras = load("janaushadhi_kendras.json")

    # ---- Jan Aushadhi
    ja_by_key = defaultdict(list)
    ja_stats = {"tabcap": 0, "parsed": 0}
    for p in ja["products"]:
        key = parse_ja(p["name"], vocab)
        if re.search(r"tablet|capsule", p["name"], re.I):
            ja_stats["tabcap"] += 1
        if not key:
            continue
        ja_stats["parsed"] += 1
        units = ja_units(p["unitSize"])
        ja_by_key[key].append({
            "drugCode": p["drugCode"],
            "name": p["name"],
            "unitSize": p["unitSize"],
            "mrp": p["mrp"],
            "perUnit": per_unit(p["mrp"], units),
        })

    # ---- NPPA: two different ceilings for one key is ambiguity -> drop both
    nppa_rows_by_key = defaultdict(list)
    for r in nppa["rows"]:
        key = parse_nppa(r["formulation"], r["dosage"], vocab)
        if key and nppa_unit_ok(key[0], r["ceilingUnit"]) and r["ceilingPrice"] is not None:
            nppa_rows_by_key[key].append(
                {k: r[k] for k in ("formulation", "dosage", "ceilingPrice", "soNumber", "soDate", "nlemVersion")}
            )
    nppa_parsed = sum(len(v) for v in nppa_rows_by_key.values())
    nppa_by_key = {
        k: v[0] if len({r["ceilingPrice"] for r in v}) == 1 else None
        for k, v in nppa_rows_by_key.items()
    }
    nppa_ambiguous = sum(1 for v in nppa_by_key.values() if v is None)

    # ---- brands (open dataset)
    brands_by_key = defaultdict(dict)
    open_parsed = 0
    for r in open_ds["rows"]:
        key = parse_open(r, vocab)
        if not key:
            continue
        open_parsed += 1
        units = open_units(r["packLabel"])
        dedupe = (r["name"].lower(), r["packLabel"].lower(), r["price"])
        brands_by_key[key][dedupe] = {
            "name": r["name"],
            "manufacturer": r["manufacturer"],
            "packLabel": r["packLabel"],
            "price": r["price"],
            "perUnit": per_unit(r["price"], units),
        }

    # ---- groups
    keys = sorted(set(ja_by_key) | {k for k, v in nppa_by_key.items() if v})
    slugs = {k: group_slug(k) for k in keys}
    assert len(set(slugs.values())) == len(slugs), "group slug collision"

    by_salts = defaultdict(list)
    for k in keys:
        by_salts[(k[0], k[1], frozenset(s for s, _ in k[2]))].append(k)

    def related(key):
        form, release, pairs = key
        salts = frozenset(s for s, _ in pairs)
        strengths = [slugs[k] for k in by_salts[(form, release, salts)] if k != key]
        pair_set = set(pairs)
        extra = [
            slugs[k] for k in keys
            if k[0] == form and k[1] == release and len(k[2]) > len(pairs) and pair_set < set(k[2])
        ]
        return strengths[:MAX_RELATED], extra[:MAX_RELATED]

    groups = []
    search = defaultdict(list)
    brands_listed = groups_with_brands = 0
    for key in keys:
        form, release, pairs = key
        brands = sorted(
            brands_by_key.get(key, {}).values(),
            key=lambda b: (b["perUnit"] is None, b["perUnit"] or 0, b["name"]),
        )
        priced = [b["perUnit"] for b in brands if b["perUnit"] is not None]
        strengths, extra = related(key)
        slug = slugs[key]
        title = group_title(pairs)
        ja_items = sorted(ja_by_key.get(key, []), key=lambda p: (p["perUnit"] is None, p["perUnit"] or 0))
        groups.append({
            "slug": slug,
            "title": title,
            "salts": [{"name": title_case(s), "strength": fmt_strength(st)} for s, st in pairs],
            "form": form,
            "release": release,
            "janAushadhi": ja_items,
            "nppaCeiling": nppa_by_key.get(key),
            "brands": brands[:MAX_BRANDS_PER_GROUP],
            "brandCount": len(brands),
            "brandPerUnit": {
                "min": min(priced), "median": round(statistics.median(priced), 2), "max": max(priced),
            } if priced else None,
            "relatedStrengths": strengths,
            "relatedExtraSalt": extra,
        })
        if brands:
            groups_with_brands += 1
            brands_listed += len(brands)

        # Search entries: [name, kind, slug, perUnit]; kind "g" = the group
        # itself (perUnit = cheapest Jan Aushadhi), "b" = one brand in it.
        best = next((p["perUnit"] for p in ja_items if p["perUnit"] is not None), None)
        for s, _ in pairs:
            k = shard_key(s)
            if k:
                search[k].append((title, "g", slug, best))
        for b in brands:
            k = shard_key(b["name"])
            if k:
                search[k].append((b["name"], "b", slug, b["perUnit"]))

    titles = {g["slug"]: g["title"] for g in groups}
    for g in groups:
        g["relatedStrengths"] = [{"slug": s, "title": titles[s]} for s in g["relatedStrengths"]]
        g["relatedExtraSalt"] = [{"slug": s, "title": titles[s]} for s in g["relatedExtraSalt"]]

    meta = {
        "janAushadhi": {"snapshotDate": ja["snapshotDate"], "url": "https://janaushadhi.gov.in"},
        "nppa": {"exportDate": nppa["exportDate"], "url": "https://www.nppaindia.nic.in"},
        "brands": {k: open_ds[k] for k in ("name", "url", "license", "snapshotDate")},
        "kendras": {"snapshotDate": kendras["snapshotDate"], "count": len(kendras["kendras"])},
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "medicines.json").write_text(
        json.dumps({"meta": meta, "groups": groups}, ensure_ascii=False), encoding="utf-8"
    )
    (OUT_DIR / "kendras.json").write_text(
        json.dumps(kendras["kendras"], ensure_ascii=False), encoding="utf-8"
    )

    search_dir = PUBLIC_DIR / "medicines" / "search"
    kendra_dir = PUBLIC_DIR / "kendras"
    for d in (search_dir, kendra_dir):
        shutil.rmtree(d, ignore_errors=True)
        d.mkdir(parents=True)
    for k, entries in search.items():
        # slugs repeat across a shard's brands, so each shard carries its own
        # slug table and entries point into it: {"s": [slug...], "e": [[name, kind, i, perUnit]]}
        table = sorted({e[2] for e in entries})
        index = {sl: i for i, sl in enumerate(table)}
        shard = {"s": table, "e": [[n, kind, index[sl], pu] for n, kind, sl, pu in dict.fromkeys(entries)]}
        # "q-" prefix: 3-letter keys include Windows device names (aux, con,
        # prn, nul), which cannot exist as files on a Windows checkout
        (search_dir / f"q-{k}.json").write_text(
            json.dumps(shard, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
    by_pin3 = defaultdict(list)
    for kd in kendras["kendras"]:
        if kd["pincode"]:
            by_pin3[kd["pincode"][:3]].append(kd)
    for k, items in by_pin3.items():
        (kendra_dir / f"{k}.json").write_text(
            json.dumps(items, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )

    with_ja = sum(1 for g in groups if g["janAushadhi"])
    with_nppa = sum(1 for g in groups if g["nppaCeiling"])
    print(f"Jan Aushadhi: {ja_stats['parsed']}/{ja_stats['tabcap']} tablet/capsule products parsed")
    print(f"NPPA: {nppa_parsed} tablet/capsule ceilings parsed, {nppa_ambiguous} dropped as ambiguous")
    print(f"Brands: {open_parsed}/{len(open_ds['rows'])} parsed; {brands_listed} fall in a v1 group")
    print(f"{len(groups)} groups -> medicines.json ({with_ja} with Jan Aushadhi, {with_nppa} with NPPA, "
          f"{groups_with_brands} with brand prices)")
    print(f"{len(kendras['kendras'])} kendras -> kendras.json, {len(by_pin3)} PIN shards")
    sizes = [f.stat().st_size for f in search_dir.iterdir()]
    print(f"{len(sizes)} search shards, {sum(sizes) / 1e6:.1f} MB total, largest {max(sizes) / 1e3:.0f} KB")


if __name__ == "__main__":
    main()
