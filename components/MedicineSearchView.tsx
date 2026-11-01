"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { MedicinesMeta } from "@/lib/types";
import { MIN_QUERY_LENGTH, normalize, searchMedicines, type MedicineHit } from "@/lib/medicineShards";
import { formatINRUnit, formatISODate } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import {
  Badge,
  Callout,
  ChipRow,
  ChoiceChip,
  DataText,
  ExtLink,
  InsetGroup,
  ListRow,
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

export default function MedicineSearchView({
  groupCount,
  jaDate,
  brands,
}: {
  groupCount: number;
  jaDate: string | null;
  brands: MedicinesMeta["brands"];
}) {
  const { t } = useTranslation();
  const announce = useAnnounce();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ for: string; hits: MedicineHit[] }>({ for: "", hits: [] });

  const q = normalize(query);
  const active = q.replace(/ /g, "").length >= MIN_QUERY_LENGTH;
  const hasQuery = query.trim() !== "";

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

  // Announce the result count once typing pauses (polite live region).
  useEffect(() => {
    if (count === null) return;
    const message = count > 0 ? t("search.count", { n: count }) : t("medicines.noResults", { q: query.trim() });
    const timer = setTimeout(() => announce(message), 600);
    return () => clearTimeout(timer);
  }, [count, query, announce, t]);

  return (
    <PageShell>
      <PageHeader title={t("medicines.title")} lead={t("medicines.lead")} />
      <Suspense fallback={null}>
        <QueryFromUrl onQuery={setQuery} />
      </Suspense>

      <div className="space-y-4">
        <TextField
          id="medicine-search"
          type="search"
          label={t("medicines.searchLabel")}
          hint={t("medicines.searchHint")}
          placeholder={t("medicines.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Close the phone keyboard so the results below are visible.
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
        />
        <PrescriptionScan onPick={setQuery} selected={query} />
        {!hasQuery && (
          <ChipRow wrap label={t("search.try")}>
            <span aria-hidden="true" className="inline-flex min-h-11 items-center text-callout text-label-2">
              {t("search.try")}
            </span>
            {TRY_CHIPS.map((chip) => (
              <ChoiceChip key={chip} type="toggle" checked={false} onChange={() => setQuery(chip)}>
                <DataText>{chip}</DataText>
              </ChoiceChip>
            ))}
          </ChipRow>
        )}
      </div>

      {active && (
        <div className="mt-6" aria-busy={loading}>
          {loading ? (
            <div aria-hidden="true" className="space-y-2">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          ) : results.hits.length === 0 ? (
            <Callout icon="search">{t("medicines.noResults", { q: query.trim() })}</Callout>
          ) : (
            <InsetGroup
              footer={
                <div className="space-y-1">
                  <p>{t("search.medicinesSource", { date: jaDate ? formatISODate(jaDate) : t("source.noDate") })}</p>
                  <p>
                    {t("medicines.brandsCredit", {
                      name: brands.name,
                      date: formatISODate(brands.snapshotDate),
                      license: brands.license,
                    })}{" "}
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
                    h.kind === "b"
                      ? t("medicines.perUnitBrand", { price: formatINRUnit(h.perUnit) })
                      : h.perUnit !== null
                        ? t("medicines.perUnitJa", { price: formatINRUnit(h.perUnit) })
                        : t("medicines.noJaPrice")
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
