"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { JanAushadhiKendra } from "@/lib/types";
import { findKendras } from "@/lib/medicineShards";
import { formatISODate } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

const PIN_RE = /^[1-9]\d{5}$/;

export default function KendraFinder({
  snapshotDate,
  total,
}: {
  snapshotDate: string | null;
  total: number;
}) {
  const { t } = useTranslation();
  const initialPin = useSearchParams().get("pin") ?? "";
  const [input, setInput] = useState(initialPin);
  const [pin, setPin] = useState(PIN_RE.test(initialPin) ? initialPin : "");
  const [invalid, setInvalid] = useState(false);
  const [results, setResults] = useState<{ for: string; kendras: JanAushadhiKendra[] }>({ for: "", kendras: [] });

  useEffect(() => {
    if (!pin) return;
    let cancelled = false;
    findKendras(pin).then((kendras) => {
      if (!cancelled) setResults({ for: pin, kendras });
    });
    return () => {
      cancelled = true;
    };
  }, [pin]);

  const ready = pin !== "" && results.for === pin;
  const area = pin.slice(0, 3);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-ink-900">{t("kendras.title")}</h1>
      <p className="mt-3 text-ink-700">{t("kendras.subtitle")}</p>

      <form
        className="mt-8 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = input.trim();
          setInvalid(!PIN_RE.test(v));
          if (PIN_RE.test(v)) setPin(v);
        }}
      >
        <input
          inputMode="numeric"
          maxLength={6}
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/\D/g, ""))}
          placeholder={t("kendras.pinPlaceholder")}
          aria-label={t("kendras.pinPlaceholder")}
          className="w-full rounded-full border border-ink-300 bg-surface px-6 py-3 text-base text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {t("kendras.search")}
        </button>
      </form>
      {invalid && <p className="mt-2 px-2 text-sm text-ink-700">{t("kendras.invalidPin")}</p>}

      {ready && (
        <section className="mt-6">
          <p className="text-sm text-ink-500">
            {results.kendras.length > 0
              ? t("kendras.results", { n: results.kendras.length, area })
              : t("kendras.none", { area })}
          </p>
          <ul className="mt-3 divide-y divide-ink-100 rounded-xl border border-ink-100 bg-surface">
            {results.kendras.map((k) => (
              <KendraRow key={k.code} kendra={k} samePin={k.pincode === pin} samePinLabel={t("kendras.samePin")} />
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-xs text-ink-500">
        {t("kendras.source", { date: formatISODate(snapshotDate), n: total.toLocaleString("en-IN") })}{" "}
        <a href="https://janaushadhi.gov.in" target="_blank" rel="noopener noreferrer" className="underline">
          {t("kendras.official")}
        </a>
        . {t("kendras.coverageGap")}
      </p>
    </div>
  );
}

export function KendraRow({
  kendra,
  samePin,
  samePinLabel,
}: {
  kendra: JanAushadhiKendra;
  samePin: boolean;
  samePinLabel: string;
}) {
  return (
    <li className="px-4 py-3">
      <div className="text-sm font-medium text-ink-900">{kendra.address ?? "—"}</div>
      <div className="mt-1 flex flex-wrap gap-2 text-xs text-ink-500">
        <span>{[kendra.district, kendra.state].filter(Boolean).join(", ")}</span>
        {kendra.pincode && <span>PIN {kendra.pincode}</span>}
        <span>{kendra.code}</span>
        {samePin && <span className="rounded bg-brand-50 px-1.5 py-0.5 text-brand-700">{samePinLabel}</span>}
      </div>
    </li>
  );
}
