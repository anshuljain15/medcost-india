"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Procedure } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export default function ProcedureGrid({ procedures }: { procedures: Procedure[] }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return procedures;
    return procedures.filter((p) => p.name.toLowerCase().includes(q));
  }, [procedures, query]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("procedures.filterPlaceholder")}
        className="mt-6 w-full max-w-sm rounded-full border border-ink-300 bg-surface px-4 py-2 text-sm text-ink-900 outline-none focus:border-brand-500"
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Link
            key={p.slug}
            href={`/procedures/${p.slug}`}
            className="rounded-xl border border-ink-100 bg-surface p-5 transition hover:border-brand-400 hover:shadow-sm"
          >
            <div className="font-semibold text-ink-900">{p.name}</div>
            <div className="mt-1 text-sm text-ink-500">
              {formatINR(p.cityLow)} – {formatINR(p.cityHigh)}
            </div>
            <div className="mt-3 flex gap-2">
              {p.hospitalPrices.length > 0 && (
                <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                  {t("procedures.hospitalsPricedBadge", { n: p.hospitalPrices.length })}
                </span>
              )}
              {p.cghsReference && (
                <span className="rounded bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700">
                  {t("procedures.cghsReferenceBadge")}
                </span>
              )}
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-ink-500">{t("procedures.noMatch", { q: query })}</p>
        )}
      </div>
    </div>
  );
}
