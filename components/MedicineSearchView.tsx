"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { MedicinesMeta } from "@/lib/types";
import {
  MEDICINE_DATA_LICENCE_URL,
  MIN_QUERY_LENGTH,
  hasIndicScript,
  normalize,
  searchMedicines,
  type MedicineHit,
} from "@/lib/medicineShards";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import {
  Badge,
  Callout,
  ChipButton,
  ChipRow,
  DataText,
  EmptyState,
  ExtLink,
  InsetGroup,
  ListRow,
  Money,
  PageHeader,
  PageNotes,
  PageShell,
  PrivacyNote,
  SectionHeader,
  Skeleton,
  TaskTile,
  TextField,
  useAnnounce,
} from "@/components/ui";
import PrescriptionScan from "@/components/PrescriptionScan";

// Medicine search reads the sharded index under public/data/medicines/search
// (lib/medicineShards.ts), never medicines.json. Only the group count and the
// source dates cross from the server.

/** Example queries, each verified to hit the shards (q-pan.json, q-dol.json). Data text, not translated. */
const TRY_CHIPS = ["Pan 40", "Dolo 650", "pantoprazole"];

const FIELD_ID = "medicine-search";

/** Stand-in for one placeholder, so a translated sentence can carry a node (a link, <Money>). */
const MARK = "\u0000";

function withNode(text: string, node: React.ReactNode): React.ReactNode {
  const at = text.indexOf(MARK);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      {node}
      {text.slice(at + MARK.length)}
    </>
  );
}

export default function MedicineSearchView({
  groupCount,
  jaDate,
  brands,
}: {
  groupCount: number;
  jaDate: string | null;
  brands: MedicinesMeta["brands"];
}) {
  const { t, formatDate } = useTranslation();
  const announce = useAnnounce();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ for: string; hits: MedicineHit[] }>({ for: "", hits: [] });

  const q = normalize(query);
  const hasQuery = query.trim() !== "";
  // The shards are Latin: never search what was typed in an Indic script
  // ("डोलो 650" would otherwise search "650" and report a false "no results").
  const nonLatin = hasIndicScript(query);
  const active = !nonLatin && q.replace(/ /g, "").length >= MIN_QUERY_LENGTH;
  // Typed enough that a search should have started, but nothing searchable:
  // say so instead of leaving the page blank. Gated on length so "P", "Pa"
  // don't flash the message while someone is still typing in English.
  const needLatin = hasQuery && !active && (nonLatin || query.trim().length >= MIN_QUERY_LENGTH);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchMedicines(q).then((hits) => {
        if (!cancelled) setResults({ for: q, hits });
      });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, active]);

  const loading = active && results.for !== q;
  const ready = active && !loading;
  const count = ready ? results.hits.length : null;

  // Announce the result count (or why nothing is searched) once typing pauses
  // (polite live region). The "English letters" hint is said once, not on
  // every pause while the person keeps typing.
  const message = needLatin
    ? t("search.medicinesMin")
    : count === null
      ? null
      : count > 0
        ? t(count === 1 ? "search.countOne" : "search.count", { n: count })
        : t("medicines.noResults", { q: query.trim() });
  const announceKey = needLatin ? "latin" : query;
  useEffect(() => {
    if (message === null) return;
    const timer = setTimeout(() => announce(message), 600);
    return () => clearTimeout(timer);
  }, [message, announceKey, announce]);

  function applyChip(chip: string) {
    setQuery(chip);
    // The pressed chip unmounts once the query is active; keep focus on the
    // field (as UniversalSearch does) rather than letting it fall to <body>.
    document.getElementById(FIELD_ID)?.focus();
  }

  return (
    <PageShell>
      <PageHeader title={t("medicines.title")} lead={t("medicines.lead")} />
      <Suspense fallback={null}>
        <QueryFromUrl onQuery={setQuery} />
      </Suspense>

      <div className="space-y-4">
        <TextField
          id={FIELD_ID}
          type="search"
          label={t("medicines.searchLabel")}
          hint={t("medicines.searchHint")}
          placeholder={t("medicines.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // Below 768px the field and its label move under the header on focus,
          // so the results fill the space above the keyboard (§2.7); the
          // keyboard's Search key closes the keyboard.
          phoneSearch
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
        />
        <PrescriptionScan onPick={setQuery} selected={query} collapsed={hasQuery} />
        {!active && (
          <ChipRow wrap label={t("search.try")}>
            <span aria-hidden="true" className="inline-flex min-h-11 items-center text-callout text-label-2">
              {t("search.try")}
            </span>
            {/* One-shot chips (no pressed state): plain buttons, as in UniversalSearch. */}
            {TRY_CHIPS.map((chip) => (
              <ChipButton key={chip} onClick={() => applyChip(chip)}>
                <DataText>{chip}</DataText>
              </ChipButton>
            ))}
          </ChipRow>
        )}
      </div>

      {needLatin && (
        <div className="mt-6">
          <Callout icon="search">{t("search.medicinesMin")}</Callout>
        </div>
      )}

      {active && (
        <div className="mt-6" aria-busy={loading}>
          {loading ? (
            <div aria-hidden="true" className="space-y-2">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          ) : results.hits.length === 0 ? (
            // A next step, not a dead end: what the data covers, and why a medicine may be missing.
            <EmptyState
              icon="search"
              title={t("medicines.noResults", { q: query.trim() })}
              action={{ href: "/methodology#medicines", label: t("medicines.methodologyLink") }}
            />
          ) : (
            <InsetGroup
              footer={
                <div className="space-y-1">
                  <p>{t("search.medicinesSource", { date: jaDate ? formatDate(jaDate) : t("source.noDate") })}</p>
                  <p>
                    {withNode(
                      t("medicines.brandsCredit", {
                        name: brands.name,
                        date: formatDate(brands.snapshotDate),
                        license: MARK,
                      }),
                      <ExtLink href={MEDICINE_DATA_LICENCE_URL}>{brands.license}</ExtLink>
                    )}{" "}
                    <ExtLink href={brands.url}>Kaggle</ExtLink>
                  </p>
                </div>
              }
            >
              {results.hits.map((h, i) => (
                <ListRow
                  key={`${h.kind}-${h.slug}-${h.name}-${i}`}
                  href={`/medicines/${h.slug}`}
                  title={<DataText>{h.name}</DataText>}
                  badges={<Badge>{h.kind === "g" ? t("medicines.kindGroup") : t("medicines.kindBrand")}</Badge>}
                  meta={
                    h.perUnit !== null
                      ? withNode(
                          t(h.kind === "b" ? "medicines.perUnitBrand" : "medicines.perUnitJa", { price: MARK }),
                          <Money value={h.perUnit} perUnit />
                        )
                      : // A brand without a listed price gets no price line at all, never "—".
                        h.kind === "g"
                        ? t("medicines.noJaPrice")
                        : undefined
                  }
                />
              ))}
            </InsetGroup>
          )}
        </div>
      )}

      {!hasQuery && (
        <section aria-labelledby="medicine-tools" className="mt-10 md:mt-16">
          <SectionHeader id="medicine-tools" title={t("medicines.toolsHeading")} />
          <div className="space-y-3">
            <TaskTile
              level={3}
              href="/check-bill"
              icon="receipt"
              title={t("nav.checkBill")}
              body={t("home.tileBillBody")}
              note={<PrivacyNote>{t("home.actionPrivate")}</PrivacyNote>}
            />
            <TaskTile level={3} href="/kendras" icon="store" title={t("nav.kendras")} body={t("home.moreKendrasSub")} />
          </div>
        </section>
      )}

      <PageNotes anchor="medicines" linkKey="medicines.methodologyLink">
        <p>{t("medicines.coverage", { n: groupCount.toLocaleString("en-IN") })}</p>
        <p>{t("medicines.disclaimer")}</p>
      </PageNotes>
    </PageShell>
  );
}

/** /medicines?q=… (e.g. "See all medicines matching" in the site search). useSearchParams needs a Suspense boundary under static export. */
function QueryFromUrl({ onQuery }: { onQuery: (q: string) => void }) {
  const q = useSearchParams().get("q");
  useEffect(() => {
    if (q) onQuery(q);
  }, [q, onQuery]);
  return null;
}
