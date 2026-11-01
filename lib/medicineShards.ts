import { fetchStaticJson } from "./staticData";
import type { JanAushadhiKendra } from "./types";

// Browser-side reads of the small JSON shards build_medicines.py writes to
// public/data/. Fetched on demand, so the 100k-brand search index and the
// 20k-store list never land in a JS bundle. fetchStaticJson (lib/staticData.ts)
// adds the static basePath and caches each shard for the session.

export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export type MedicineHit = {
  name: string;
  /** "g" = the medicine group itself, "b" = one brand within it. */
  kind: "g" | "b";
  slug: string;
  /** g: cheapest Jan Aushadhi per unit; b: that brand's own per unit. */
  perUnit: number | null;
};

type SearchShard = { s: string[]; e: [string, "g" | "b", number, number | null][] };

export const MIN_QUERY_LENGTH = 3;

/**
 * Ranks: whole query is a prefix of the name, then every query word prefixes
 * some name word, then only the first word matches -- so "Pantocid 40" still
 * finds "Pantocid Tablet", whose name carries no strength.
 */
export async function searchMedicines(query: string, limit = 20): Promise<MedicineHit[]> {
  const q = normalize(query);
  const key = q.replace(/ /g, "").slice(0, MIN_QUERY_LENGTH);
  if (key.length < MIN_QUERY_LENGTH) return [];
  const shard = await fetchStaticJson<SearchShard>(`medicines/search/q-${key}.json`, { s: [], e: [] });

  const qWords = q.split(" ");
  const scored: { hit: MedicineHit; score: number }[] = [];
  for (const [name, kind, slugIndex, perUnit] of shard.e) {
    const n = normalize(name);
    const words = n.split(" ");
    let score: number;
    if (n.startsWith(q)) score = 0;
    else if (qWords.every((w) => words.some((x) => x.startsWith(w)))) score = 1;
    else if (words.some((x) => x.startsWith(qWords[0]))) score = 2;
    else continue;
    scored.push({ hit: { name, kind, slug: shard.s[slugIndex], perUnit }, score });
  }
  scored.sort(
    (a, b) =>
      a.score - b.score ||
      (a.hit.kind === b.hit.kind ? 0 : a.hit.kind === "g" ? -1 : 1) ||
      a.hit.name.localeCompare(b.hit.name)
  );
  return scored.slice(0, limit).map((s) => s.hit);
}

/** Same PIN first, then the rest of the 3-digit postal area by PIN distance. */
export async function findKendras(pincode: string): Promise<JanAushadhiKendra[]> {
  if (!/^[1-9]\d{5}$/.test(pincode)) return [];
  const area = await fetchStaticJson<JanAushadhiKendra[]>(`kendras/${pincode.slice(0, 3)}.json`, []);
  const pin = Number(pincode);
  return [...area].sort(
    (a, b) => Math.abs(Number(a.pincode) - pin) - Math.abs(Number(b.pincode) - pin)
  );
}
