"use client";

import Link from "next/link";
import { getCities, getHospitalsByCity } from "@/lib/data";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export default function HospitalsIndexPage() {
  const { t } = useTranslation();
  const cities = getCities();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-bold text-ink-900">{t("hospitals.title")}</h1>
      <p className="mt-2 text-ink-700">{t("hospitals.subtitle")}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {cities.map((city) => {
          const count = getHospitalsByCity(city).length;
          return (
            <Link
              key={city}
              href={`/hospitals/${city.toLowerCase()}`}
              className="rounded-xl border border-ink-100 bg-surface p-5 transition hover:border-brand-400 hover:shadow-sm"
            >
              <div className="text-lg font-semibold text-ink-900">{city}</div>
              <div className="text-sm text-ink-500">{t("hospitals.count", { n: count })}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
