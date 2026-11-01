// Builds the grouped result list for universal search (docs/design-system.md
// §2.7). Pure functions over the static indexes from lib/staticData.ts and the
// medicine hits from lib/medicineShards.ts; nothing here fetches.
//
// Groups: Treatments · Bangalore prices, Medicines, Hospitals, Tools and pages.
// At most 4 rows each, groups ordered by their best score with treatments
// first on ties. A 6-digit PIN query gives the Jan Aushadhi store row first,
// then the hospitals with that PIN.

import type { IconName } from "@/components/ui/Icon";
import type { MedicineHit } from "@/lib/medicineShards";
import { SEARCH_ROUTES, type SearchRoute } from "@/lib/search/routes";
import { synonymsFor } from "@/lib/search/synonyms";
import type { HospitalIndex, ProcedureIndex } from "@/lib/staticData";
import { PIN_RE, SCORE_PREFIX, SCORE_SUBSTRING, allWordsStart, prepare, scoreBest, scoreOne, type Prepared, type Query } from "./match";

export type SearchScope = "all" | "hospitals";

/** Rows per group in the universal search. */
export const ROWS_PER_GROUP = 4;
/** Rows when the search is scoped to hospitals (the /hospitals page), its only group. */
export const HOSPITAL_SCOPE_ROWS = 8;
/** The empty state offers the first 4 routes, which are the tools (lib/search/routes.ts). */
export const EMPTY_STATE_TOOLS = 4;

type Base = { key: string; href: string };
export type SearchItem =
  | (Base & { kind: "procedure"; name: string; low: number | null; high: number | null })
  | (Base & { kind: "medicine"; name: string; medKind: "g" | "b"; perUnit: number | null })
  | (Base & { kind: "seeAllMedicines"; query: string })
  | (Base & { kind: "hospital"; name: string; city: string; pincode: string | null })
  | (Base & { kind: "page"; titleKey: string; icon: IconName })
  | (Base & { kind: "pin"; pin: string });

export type GroupKey = "pin" | "treatments" | "medicines" | "hospitals" | "pages";
export type SearchGroup = { key: GroupKey; items: SearchItem[] };

const PAGE_ICON: Record<string, IconName> = {
  "/check-quote": "clipboard",
  "/check-bill": "receipt",
  "/medicines": "pill",
  "/kendras": "store",
  "/procedures": "clipboard",
  "/rates": "clipboard",
  "/hospitals": "hospital",
  "/share-bill": "users",
  "/methodology": "source",
  "/": "home",
};

// ---- Prepared indexes (normalised once, when an index arrives) -------------

export type PreparedProcedures = {
  date: string | null;
  rows: { slug: string; name: string; low: number | null; high: number | null; nameHay: Prepared; synHays: Prepared[] }[];
};

export function prepareProcedures(idx: ProcedureIndex): PreparedProcedures {
  return {
    date: idx.date,
    rows: idx.p.map(([slug, name, low, high]) => ({
      slug,
      name,
      low,
      high,
      nameHay: prepare(name),
      synHays: synonymsFor(slug).map(prepare),
    })),
  };
}

export type PreparedHospitals = {
  rows: {
    name: string;
    citySlug: string;
    city: string;
    slug: string;
    pincode: string | null;
    nameHay: Prepared;
    allHay: Prepared;
  }[];
};

export function prepareHospitals(idx: HospitalIndex): PreparedHospitals {
  const rows: PreparedHospitals["rows"] = [];
  for (const [name, cityIndex, slug, pincode] of idx.h) {
    const citySlug = idx.c[cityIndex];
    const city = idx.l[cityIndex] ?? citySlug;
    if (!citySlug || !slug) continue;
    rows.push({
      name,
      citySlug,
      city,
      slug,
      pincode,
      nameHay: prepare(name),
      allHay: prepare(`${name} ${city} ${pincode ?? ""}`),
    });
  }
  return { rows };
}

export type PreparedPages = { route: SearchRoute; titleHay: Prepared; keywordHays: Prepared[] }[];

/** Titles are matched in the current language; keywords hold both en and hi. */
export function preparePages(title: (key: string) => string): PreparedPages {
  return SEARCH_ROUTES.map((route) => ({
    route,
    titleHay: prepare(title(route.titleKey)),
    keywordHays: route.keywords.map(prepare),
  }));
}

export function pageItem(route: SearchRoute): SearchItem {
  return { kind: "page", key: `p:${route.href}`, href: route.href, titleKey: route.titleKey, icon: PAGE_ICON[route.href] ?? "chevron-right" };
}

/** Empty query: the first 4 tools (the "Try:" chips are rendered by the component). */
export function emptyStateGroups(): SearchGroup[] {
  return [{ key: "pages", items: SEARCH_ROUTES.slice(0, EMPTY_STATE_TOOLS).map(pageItem) }];
}

// ---- Ranking -----------------------------------------------------------------

/**
 * rank = score * 2 + 1 when the row's own name (not an alias) carries the best
 * score, so a direct name match sorts above an alias match of the same score.
 * Ties fall back to the normalised name, A to Z.
 */
type Ranked<T> = { item: T; rank: number; tie: string };

function better<T>(a: Ranked<T>, b: Ranked<T>): boolean {
  return a.rank > b.rank || (a.rank === b.rank && a.tie < b.tie);
}

/** Keeps the best `n` entries in order without sorting the whole list. */
function pushTop<T>(top: Ranked<T>[], entry: Ranked<T>, n: number): void {
  let i = top.length;
  while (i > 0 && better(entry, top[i - 1])) i--;
  if (i >= n) return;
  top.splice(i, 0, entry);
  if (top.length > n) top.pop();
}

function bestScore<T>(top: Ranked<T>[]): number {
  return top.length ? Math.floor(top[0].rank / 2) : 0;
}

function rankOf(base: number, nameScore: number): number {
  return base * 2 + (base > 0 && nameScore === base ? 1 : 0);
}

const DIGITS = /^\d{3,6}$/;

function hospitalItem(row: PreparedHospitals["rows"][number]): SearchItem {
  return {
    kind: "hospital",
    key: `h:${row.citySlug}/${row.slug}`,
    href: `/hospitals/${row.citySlug}/${row.slug}`,
    name: row.name,
    city: row.city,
    pincode: row.pincode,
  };
}

const GROUP_ORDER: Record<GroupKey, number> = { pin: -1, treatments: 0, medicines: 1, hospitals: 2, pages: 3 };

export function buildGroups({
  q,
  raw,
  scope,
  procedures,
  hospitals,
  pages,
  medicines,
}: {
  q: Query;
  /** The trimmed query as typed (for the PIN row and "See all medicines"). */
  raw: string;
  scope: SearchScope;
  procedures: PreparedProcedures | null;
  hospitals: PreparedHospitals | null;
  pages: PreparedPages;
  /** null while the medicine search is pending or not applicable. */
  medicines: MedicineHit[] | null;
}): SearchGroup[] {
  const hospitalRows = scope === "hospitals" ? HOSPITAL_SCOPE_ROWS : ROWS_PER_GROUP;

  // A full PIN: the store finder first, then the hospitals with that PIN.
  if (PIN_RE.test(raw)) {
    const groups: SearchGroup[] = [];
    if (scope === "all") {
      groups.push({ key: "pin", items: [{ kind: "pin", key: `pin:${raw}`, href: `/kendras?pin=${raw}`, pin: raw }] });
    }
    const top: Ranked<PreparedHospitals["rows"][number]>[] = [];
    for (const row of hospitals?.rows ?? []) {
      if (row.pincode === raw) pushTop(top, { item: row, rank: SCORE_PREFIX * 2, tie: row.nameHay.text }, hospitalRows);
    }
    if (top.length) groups.push({ key: "hospitals", items: top.map((r) => hospitalItem(r.item)) });
    return groups;
  }

  const scored: { key: GroupKey; best: number; items: SearchItem[] }[] = [];

  if (scope === "all" && procedures) {
    const top: Ranked<PreparedProcedures["rows"][number]>[] = [];
    for (const row of procedures.rows) {
      const nameScore = scoreOne(row.nameHay, q);
      const base = Math.max(nameScore, scoreBest(row.synHays, q));
      if (base > 0) pushTop(top, { item: row, rank: rankOf(base, nameScore), tie: row.nameHay.text }, ROWS_PER_GROUP);
    }
    if (top.length) {
      scored.push({
        key: "treatments",
        best: bestScore(top),
        items: top.map(({ item }) => ({
          kind: "procedure",
          key: `t:${item.slug}`,
          href: `/procedures/${item.slug}`,
          name: item.name,
          low: item.low,
          high: item.high,
        })),
      });
    }
  }

  if (scope === "all" && medicines && medicines.length) {
    const hits = medicines.slice(0, ROWS_PER_GROUP);
    // The shard search already matched these by word prefix; keep at least a
    // substring score so its own order (and "Pantocid 40" -> "Pantocid") holds.
    const best = Math.max(...hits.map((h) => Math.max(SCORE_SUBSTRING, scoreOne(prepare(h.name), q))));
    scored.push({
      key: "medicines",
      best,
      items: [
        ...hits.map(
          (h, i): SearchItem => ({
            kind: "medicine",
            key: `m${i}:${h.kind}:${h.slug}:${h.name}`,
            href: `/medicines/${h.slug}`,
            name: h.name,
            medKind: h.kind,
            perUnit: h.perUnit,
          })
        ),
        { kind: "seeAllMedicines", key: "m:all", href: `/medicines?q=${encodeURIComponent(raw)}`, query: raw },
      ],
    });
  }

  if (hospitals) {
    const digits = DIGITS.test(q.text);
    const multiWord = q.tokens.length > 1;
    const top: Ranked<PreparedHospitals["rows"][number]>[] = [];
    for (const row of hospitals.rows) {
      const nameScore = scoreOne(row.nameHay, q);
      let base = nameScore;
      if (digits && row.pincode?.startsWith(q.text)) base = SCORE_PREFIX;
      // "apollo bangalore": every word starts a word of name + city + PIN.
      else if (base === 0 && multiWord && allWordsStart(row.allHay, q)) base = SCORE_SUBSTRING;
      if (base > 0) pushTop(top, { item: row, rank: rankOf(base, nameScore), tie: row.nameHay.text }, hospitalRows);
    }
    if (top.length) scored.push({ key: "hospitals", best: bestScore(top), items: top.map((r) => hospitalItem(r.item)) });
  }

  if (scope === "all") {
    const top: Ranked<SearchRoute>[] = [];
    pages.forEach((page, i) => {
      const nameScore = scoreOne(page.titleHay, q);
      const base = Math.max(nameScore, scoreBest(page.keywordHays, q));
      // Tie-break on the routes.ts order (tools first), not the title.
      if (base > 0) pushTop(top, { item: page.route, rank: rankOf(base, nameScore), tie: String(i).padStart(2, "0") }, ROWS_PER_GROUP);
    });
    if (top.length) scored.push({ key: "pages", best: bestScore(top), items: top.map((r) => pageItem(r.item)) });
  }

  scored.sort((a, b) => b.best - a.best || GROUP_ORDER[a.key] - GROUP_ORDER[b.key]);
  return scored.map(({ key, items }) => ({ key, items }));
}
