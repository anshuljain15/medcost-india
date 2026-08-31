"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Procedure } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export default function ProcedureSearch({ procedures }: { procedures: Procedure[] }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return procedures.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [procedures, query]);

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={t("home.searchPlaceholder")}
        className="w-full rounded-full border border-ink-300 bg-surface px-6 py-4 text-base text-ink-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      {focused && query.trim() && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-ink-100 bg-surface text-left shadow-lg">
          {matches.length === 0 && (
            <div className="px-5 py-4 text-sm text-ink-500">{t("home.searchNoMatch", { q: query })}</div>
          )}
          {matches.map((p) => (
            <Link
              key={p.slug}
              href={`/procedures/${p.slug}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-brand-50"
            >
              <span className="font-medium text-ink-900">{p.name}</span>
              <span className="text-sm text-ink-500">
                {formatINR(p.cityLow)} – {formatINR(p.cityHigh)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
