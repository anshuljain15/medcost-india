"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Procedure } from "@/lib/types";
import { assessQuote, type Ward } from "@/lib/billCheck";
import { formatINR } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import ShareButton from "@/components/ShareButton";

const WARDS: Ward[] = ["general", "semiPrivate", "private"];

function parseAmount(s: string): number | null {
  const n = Number(s.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function QuoteCheckView({ procedures }: { procedures: Procedure[] }) {
  const { t, dict } = useTranslation();
  const sorted = useMemo(() => [...procedures].sort((a, b) => a.name.localeCompare(b.name)), [procedures]);
  const [slug, setSlug] = useState("");
  const [amountText, setAmountText] = useState("");
  const [ward, setWard] = useState<Ward>("general");

  // /check-quote#knee-replacement preselects, so procedure pages can link here.
  useEffect(() => {
    const fromHash = decodeURIComponent(window.location.hash.slice(1));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the hash only exists after mount
    if (procedures.some((p) => p.slug === fromHash)) setSlug(fromHash);
  }, [procedures]);

  const procedure = procedures.find((p) => p.slug === slug);
  const quote = parseAmount(amountText);
  const result = procedure && quote ? assessQuote(procedure, quote, ward) : null;

  const verdict =
    result && procedure
      ? t(`quote.verdict.${result.position}`, { proc: procedure.name })
      : "";

  const shareText =
    procedure && quote
      ? t("quote.shareText", {
          proc: procedure.name,
          quote: formatINR(quote),
          low: formatINR(procedure.cityLow),
          high: formatINR(procedure.cityHigh),
        })
      : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">{t("quote.eyebrow")}</div>
      <h1 className="mt-2 text-3xl font-bold text-ink-900">{t("quote.title")}</h1>
      <p className="mt-3 text-ink-700">{t("quote.subtitle")}</p>

      <div className="mt-8 grid gap-4 rounded-2xl border border-ink-100 bg-surface p-5 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-ink-900">{t("quote.procedureLabel")}</span>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-300 bg-surface px-3 py-2.5 text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">{t("quote.procedurePlaceholder")}</option>
            {sorted.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink-900">{t("quote.amountLabel")}</span>
          <div className="mt-1 flex items-center rounded-lg border border-ink-300 bg-surface focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
            <span className="pl-3 text-ink-500">₹</span>
            <input
              inputMode="numeric"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value.replace(/[^\d,]/g, ""))}
              placeholder="1,50,000"
              className="w-full bg-transparent px-2 py-2.5 text-ink-900 outline-none"
            />
          </div>
        </label>

        <fieldset className={procedure?.cghsReference ? "" : "opacity-50"} disabled={!procedure?.cghsReference}>
          <legend className="text-sm font-medium text-ink-900">{t("quote.wardLabel")}</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {WARDS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWard(w)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  ward === w ? "border-brand-600 bg-brand-50 font-semibold text-brand-800" : "border-ink-300 text-ink-700"
                }`}
              >
                {t(`quote.ward.${w}`)}
              </button>
            ))}
          </div>
          {procedure && !procedure.cghsReference && (
            <p className="mt-1 text-xs text-ink-500">{t("quote.wardNoCghs")}</p>
          )}
        </fieldset>
      </div>

      {procedure && result && quote && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-ink-100 bg-surface">
          <div
            className={`px-5 py-4 ${
              result.position === "above" ? "bg-warn-50 text-warn-900" : "bg-brand-50 text-brand-900"
            }`}
          >
            <p className="text-lg font-semibold">{verdict}</p>
          </div>

          <div className="space-y-6 p-5">
            {result.rangeFraction !== null && (
              <div>
                <div className="text-xs uppercase tracking-wide text-ink-500">{t("quote.rangeHeading")}</div>
                <div className="relative mt-8 h-3 rounded-full bg-brand-100">
                  <div
                    className="absolute -top-7 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-ink-900"
                    style={{ left: `${result.rangeFraction * 100}%` }}
                  >
                    {result.position === "below" ? "◀ " : ""}
                    {formatINR(quote)}
                    {result.position === "above" ? " ▶" : ""}
                  </div>
                  <div
                    className={`absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-surface ${
                      result.position === "above" ? "bg-warn-700" : "bg-brand-600"
                    }`}
                    style={{ left: `${result.rangeFraction * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-ink-500">
                  <span>{formatINR(procedure.cityLow)}</span>
                  <span>{formatINR(procedure.cityHigh)}</span>
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  {t("quote.rangeSource")}{" "}
                  <a href={procedure.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    HexaHealth
                  </a>
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
                <div className="text-xs uppercase tracking-wide text-ink-500">{t("quote.hospitalsHeading")}</div>
                {result.hospitalsCompared > 0 ? (
                  <p className="mt-1 text-ink-900">
                    {t("quote.hospitalsBelow", { below: result.hospitalsBelow, n: result.hospitalsCompared })}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-ink-500">{t("quote.hospitalsNone")}</p>
                )}
                <Link href={`/procedures/${procedure.slug}`} className="mt-2 inline-block text-sm text-brand-700 hover:underline">
                  {t("quote.seeHospitals")}
                </Link>
              </div>

              <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
                <div className="text-xs uppercase tracking-wide text-ink-500">{t("quote.cghsHeading")}</div>
                {result.cghsRate && result.cghsMultiple && procedure.cghsReference ? (
                  <>
                    <p className="mt-1 text-ink-900">
                      {t("quote.cghsMultiple", {
                        x: result.cghsMultiple.toLocaleString("en-IN", { maximumFractionDigits: 1 }),
                        rate: formatINR(result.cghsRate),
                      })}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      {procedure.cghsReference.name} ({procedure.cghsReference.code}) · {t(`quote.ward.${ward}`)}
                      {procedure.cghsReference.nabh ? " · NABH" : ""}. {t("quote.cghsExplain")}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-ink-500">{t("quote.cghsNone")}</p>
                )}
              </div>
            </div>

            <ShareButton text={shareText} path="/check-quote" />
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink-900">{t("quote.askHeading")}</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-700">
          {dict.quote.askList.map((q) => (
            <li key={q} className="flex gap-2">
              <span className="text-brand-600">✓</span>
              <span>{q}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-xl bg-ink-50 p-4 text-sm text-ink-700">{t("quote.rights")}</p>
      </section>

      <p className="mt-8 rounded-xl border border-dashed border-ink-300 p-4 text-sm text-ink-700">
        {t("quote.disclaimer")}{" "}
        <Link href="/methodology" className="underline">
          {t("check.methodologyLink")}
        </Link>
      </p>
    </div>
  );
}
