"""
HexaHealth's per-city "cost-in-<city>" pages carry a real hospital-wise
min/avg/max cost table in server-rendered HTML — the only easy hospital-
specific pricing source found. Their robots.txt explicitly allow-lists
ClaudeBot. These are editorial estimates, not billed amounts.

Resumable via a JSONL cache (same pattern as scrap/enrich_hospital_quality.py)
since this is 61+ HTTP fetches and this environment has previously killed
long-running jobs unpredictably.

Usage: python data-pipeline/sources/hexahealth.py [city]
Output: data-pipeline/output/hexahealth_<city>.json
        data-pipeline/output/hexahealth_<city>_cache.jsonl (resume cache)
"""

import json
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

SITEMAP_URL = "https://www.hexahealth.com/catalogue-sitemap.xml"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; ClaudeBot/1.0; +https://www.anthropic.com)"}
OUT_DIR = Path(__file__).resolve().parent.parent / "output"


def get_cost_page_urls(city: str) -> list[str]:
    resp = requests.get(SITEMAP_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    urls = re.findall(r"<loc>(.*?)</loc>", resp.text)
    suffix = f"-cost-in-{city}"
    return [u for u in urls if suffix in u]


def slug_to_name(url: str, city: str) -> str:
    slug = url.rstrip("/").rsplit("/", 1)[-1]
    slug = slug.replace(f"-cost-in-{city}", "")
    return slug.replace("-", " ").title()


def parse_page(html: str) -> dict:
    result = {"cityLow": None, "cityHigh": None, "hospitals": []}

    for m in re.finditer(r'"@type":"AggregateOffer"[^}]*}', html):
        block = m.group(0)
        low = re.search(r'"lowPrice":"([^"]*)"', block)
        high = re.search(r'"highPrice":"([^"]*)"', block)
        if low:
            result["cityLow"] = low.group(1)
        if high:
            result["cityHigh"] = high.group(1)
        break

    soup = BeautifulSoup(html, "lxml")
    for table in soup.find_all("table"):
        header_cells = [th.get_text(strip=True).lower() for th in table.find_all("th")]
        if not any("hospital" in h for h in header_cells):
            continue
        for row in table.find_all("tr")[1:]:
            cells = [td.get_text(strip=True) for td in row.find_all("td")]
            if len(cells) < 3:
                continue
            name, range_str, avg = cells[0], cells[1], cells[2]
            prices = re.findall(r"[\d,]+", range_str)
            min_p = prices[0].replace(",", "") if len(prices) > 0 else None
            max_p = prices[1].replace(",", "") if len(prices) > 1 else None
            avg_prices = re.findall(r"[\d,]+", avg)
            avg_p = avg_prices[0].replace(",", "") if avg_prices else None
            if name and (min_p or avg_p):
                result["hospitals"].append({
                    "name": name,
                    "min": int(min_p) if min_p else None,
                    "max": int(max_p) if max_p else None,
                    "avg": int(avg_p) if avg_p else None,
                })
        break

    return result


def load_cache(path: Path) -> dict:
    cache = {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                rec = json.loads(line)
                cache[rec["url"]] = rec
    except FileNotFoundError:
        pass
    return cache


def main():
    city = sys.argv[1] if len(sys.argv) > 1 else "bangalore"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = OUT_DIR / f"hexahealth_{city}_cache.jsonl"
    out_path = OUT_DIR / f"hexahealth_{city}.json"

    urls = get_cost_page_urls(city)
    print(f"{len(urls)} {city} cost pages found")

    cache = load_cache(cache_path)
    print(f"resuming with {len(cache)} cached" if cache else "starting fresh")

    cache_file = open(cache_path, "a", encoding="utf-8")
    try:
        for i, url in enumerate(urls, start=1):
            if url in cache:
                continue
            try:
                resp = requests.get(url, headers=HEADERS, timeout=30)
                resp.raise_for_status()
                parsed = parse_page(resp.text)
            except Exception as e:
                print(f"  [{i}/{len(urls)}] {url} ERROR: {e}")
                parsed = {"cityLow": None, "cityHigh": None, "hospitals": []}
            rec = {
                "url": url,
                "procedureName": slug_to_name(url, city),
                **parsed,
            }
            cache[url] = rec
            cache_file.write(json.dumps(rec, ensure_ascii=False) + "\n")
            cache_file.flush()
            time.sleep(0.3)
            if i % 10 == 0 or i == len(urls):
                print(f"  [{i}/{len(urls)}] done")
    finally:
        cache_file.close()

    records = [cache[u] for u in urls]
    out_path.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    with_hospitals = sum(1 for r in records if r["hospitals"])
    print(f"{len(records)} pages -> {out_path} ({with_hospitals} with a hospital table)")


if __name__ == "__main__":
    main()
