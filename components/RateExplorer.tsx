"use client";

import { useMemo, useState } from "react";
import type { CghsRate } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

const PAGE_SIZE = 50;

export default function RateExplorer({
  rates,
  specialties,
}: {
  rates: CghsRate[];
  specialties: string[];
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q && !specialty) return [];
    return rates.filter((r) => {
      if (specialty && r.specialty !== specialty) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rates, query, specialty]);

  const shown = filtered.slice(0, visible);

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisible(PAGE_SIZE);
          }}
          placeholder={t("rates.searchPlaceholder")}
          className="flex-1 rounded-full border border-ink-300 bg-surface px-4 py-2 text-sm text-ink-900 outline-none focus:border-brand-500"
        />
        <select
          value={specialty}
          onChange={(e) => {
            setSpecialty(e.target.value);
            setVisible(PAGE_SIZE);
          }}
          className="rounded-full border border-ink-300 bg-surface px-4 py-2 text-sm text-ink-900 outline-none focus:border-brand-500"
        >
          <option value="">{t("rates.allSpecialties")}</option>
          {specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {!query && !specialty && (
        <p className="mt-8 text-sm text-ink-500">{t("rates.promptSearch", { n: rates.length.toLocaleString("en-IN") })}</p>
      )}

      {(query || specialty) && (
        <>
          <p className="mt-4 text-xs text-ink-500">
            {t("rates.matchingRows", { n: filtered.length.toLocaleString("en-IN") })}
          </p>
          <div className="mt-2 overflow-x-auto rounded-xl border border-ink-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3">{t("rates.colCode")}</th>
                  <th className="px-4 py-3">{t("rates.colProcedure")}</th>
                  <th className="px-4 py-3">{t("rates.colNabh")}</th>
                  <th className="px-4 py-3">{t("rates.colGeneral")}</th>
                  <th className="px-4 py-3">{t("rates.colSemiPrivate")}</th>
                  <th className="px-4 py-3">{t("rates.colPrivate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {shown.map((r, i) => (
                  <tr key={`${r.code}-${r.nabh}-${i}`}>
                    <td className="px-4 py-3 font-mono text-xs text-ink-500">{r.code}</td>
                    <td className="px-4 py-3 font-medium text-ink-900">{r.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          r.nabh
                            ? "rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
                            : "rounded bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700"
                        }
                      >
                        {r.nabh ? t("rates.colNabh") : `Non-${t("rates.colNabh")}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatINR(Number(r.generalWard))}</td>
                    <td className="px-4 py-3">{formatINR(Number(r.semiPrivateWard))}</td>
                    <td className="px-4 py-3">{formatINR(Number(r.privateWard))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visible < filtered.length && (
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="mt-4 rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-900 hover:bg-ink-50"
            >
              {t("rates.loadMore", { n: Math.min(PAGE_SIZE, filtered.length - visible) })}
            </button>
          )}
        </>
      )}
    </div>
  );
}
