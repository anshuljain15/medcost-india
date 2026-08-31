"use client";

import { getCghsRates, getCghsSpecialties } from "@/lib/cghs";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import RateExplorer from "@/components/RateExplorer";

export default function RatesPage() {
  const { t } = useTranslation();
  const rates = getCghsRates();
  const specialties = getCghsSpecialties();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">{t("rates.eyebrow")}</p>
      <h1 className="mt-2 text-2xl font-bold text-ink-900">{t("rates.title")}</h1>
      <p className="mt-2 max-w-3xl text-ink-700">
        {t("rates.subtitle", { n: rates.length.toLocaleString("en-IN"), m: specialties.length })}
      </p>
      <RateExplorer rates={rates} specialties={specialties} />
    </div>
  );
}
