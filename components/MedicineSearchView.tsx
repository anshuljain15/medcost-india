"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MIN_QUERY_LENGTH, normalize, searchMedicines, type MedicineHit } from "@/lib/medicineShards";
import { formatINRUnit } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import PrescriptionScan from "@/components/PrescriptionScan";

export default function MedicineSearchView({ groupCount }: { groupCount: number }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ for: string; hits: MedicineHit[] }>({ for: "", hits: [] });

  const q = normalize(query);
  const active = q.replace(/ /g, "").length >= MIN_QUERY_LENGTH;

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">{t("medicines.eyebrow")}</div>
      <h1 className="mt-2 text-3xl font-bold text-ink-900">{t("medicines.title")}</h1>
      <p className="mt-3 text-ink-700">{t("medicines.subtitle")}</p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("medicines.searchPlaceholder")}
        aria-label={t("medicines.searchPlaceholder")}
        className="mt-8 w-full rounded-full border border-ink-300 bg-surface px-6 py-4 text-base text-ink-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      <div className="mt-2 px-2 text-xs text-ink-500">
        {!active ? t("medicines.searchHint") : loading ? t("medicines.searching") : null}
      </div>

      {active && !loading && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-ink-100 bg-surface">
          {results.hits.length === 0 ? (
            <div className="px-5 py-4 text-sm text-ink-500">{t("medicines.noResults", { q: query.trim() })}</div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {results.hits.map((h, i) => (
                <li key={`${h.kind}-${h.slug}-${h.name}-${i}`}>
                  <Link
                    href={`/medicines/${h.slug}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-brand-50"
                  >
                    <span>
                      <span className="mr-2 rounded bg-ink-50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-500">
                        {h.kind === "g" ? t("medicines.kindGroup") : t("medicines.kindBrand")}
                      </span>
                      <span className="font-medium text-ink-900">{h.name}</span>
                    </span>
                    <span className="shrink-0 text-right text-sm text-ink-500">
                      {h.kind === "b"
                        ? t("medicines.perUnitBrand", { price: formatINRUnit(h.perUnit) })
                        : h.perUnit !== null
                          ? t("medicines.perUnitJa", { price: formatINRUnit(h.perUnit) })
                          : t("medicines.noJaPrice")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <PrescriptionScan onPick={setQuery} />

      <p className="mt-8 text-sm text-ink-500">{t("medicines.coverage", { n: groupCount.toLocaleString("en-IN") })}</p>
      <Link href="/kendras" className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline">
        {t("medicines.findKendra")}
      </Link>

      <p className="mt-8 rounded-xl border border-dashed border-ink-300 p-4 text-sm text-ink-700">
        {t("medicines.disclaimer")}{" "}
        <Link href="/methodology" className="underline">
          {t("medicines.methodologyLink")}
        </Link>
        .
      </p>
    </div>
  );
}
