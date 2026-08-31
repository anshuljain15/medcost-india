"use client";

import Link from "next/link";
import { getAllProcedures, getCities } from "@/lib/data";
import { formatINR } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import ProcedureSearch from "@/components/ProcedureSearch";

export default function Home() {
  const { t, dict } = useTranslation();
  const procedures = getAllProcedures();
  const cities = getCities();

  const featured = procedures.find((p) => p.slug === "kidney-transplant") ?? procedures[0];

  return (
    <div>
      <section className="border-b border-ink-100 bg-gradient-to-b from-brand-50 to-background px-4 py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="rounded-full bg-brand-100 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-brand-800">
            {t("home.eyebrow")}
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
            {t("home.title")}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-700">{t("home.subtitle")}</p>
          <div className="mt-8 flex w-full justify-center">
            <ProcedureSearch procedures={procedures} />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-ink-500">
            <span>{t("home.statProcedures", { n: procedures.length })}</span>
            <span>{t("home.statHospitals")}</span>
            <span>{t("home.statCities", { n: cities.length })}</span>
          </div>
        </div>
      </section>

      {featured && (
        <section className="border-b border-ink-100 px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
              {t("home.exampleEyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink-900">
              {featured.name} {t("home.exampleTitleSuffix")}
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-ink-100 bg-ink-50 p-5">
                <div className="text-xs uppercase tracking-wide text-ink-500">{t("home.marketRange")}</div>
                <div className="mt-1 text-xl font-bold text-ink-900">
                  {formatINR(featured.cityLow)} – {formatINR(featured.cityHigh)}
                </div>
                <div className="mt-1 text-xs text-ink-500">{t("home.sourceHexaHealth")}</div>
              </div>
              <div className="rounded-xl border border-ink-100 bg-ink-50 p-5">
                <div className="text-xs uppercase tracking-wide text-ink-500">{t("home.hospitalsPriced")}</div>
                <div className="mt-1 text-xl font-bold text-ink-900">
                  {featured.hospitalPrices.length}
                </div>
                <div className="mt-1 text-xs text-ink-500">{t("home.namedHospitals")}</div>
              </div>
              <div className="rounded-xl border border-ink-100 bg-ink-50 p-5">
                <div className="text-xs uppercase tracking-wide text-ink-500">{t("home.govReference")}</div>
                <div className="mt-1 text-xl font-bold text-ink-900">
                  {featured.cghsReference ? formatINR(Number(featured.cghsReference.generalWard)) : t("home.notAvailable")}
                </div>
                <div className="mt-1 text-xs text-ink-500">{t("home.tierNote")}</div>
              </div>
            </div>
            <Link
              href={`/procedures/${featured.slug}`}
              className="mt-6 inline-block text-sm font-semibold text-brand-700 hover:underline"
            >
              {t("home.seeComparison")}
            </Link>
          </div>
        </section>
      )}

      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-ink-900">{t("home.featuresHeading")}</h2>
          <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {dict.home.features.map((f, i) => (
              <div key={f.title}>
                <div className="text-sm font-bold text-brand-600">{String(i + 1).padStart(2, "0")}</div>
                <div className="mt-2 font-semibold text-ink-900">{f.title}</div>
                <p className="mt-1 text-sm text-ink-700">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-ink-100 bg-contrast px-4 py-16 text-contrast-fg">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h2 className="text-2xl font-bold">{t("home.ctaHeading")}</h2>
            <p className="mt-2 max-w-md text-[#cbd5e1]">{t("home.ctaBody")}</p>
          </div>
          <Link
            href="/hospitals"
            className="shrink-0 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-[#0f172a] hover:bg-brand-400"
          >
            {t("home.ctaButton")}
          </Link>
        </div>
      </section>
    </div>
  );
}
