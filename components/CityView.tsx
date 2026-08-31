"use client";

import type { Hospital } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import HospitalListClient from "@/components/HospitalListClient";
import HospitalMap from "@/components/HospitalMapLoader";

export default function CityView({
  cityLabel,
  citySlug,
  hospitals,
}: {
  cityLabel: string;
  citySlug: string;
  hospitals: Hospital[];
}) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink-900">
        {cityLabel} {t("city.titleSuffix")}
      </h1>
      <p className="mt-1 text-sm text-ink-500">{t("city.subtitle", { n: hospitals.length })}</p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="h-[520px] overflow-hidden rounded-xl border border-ink-100">
          <HospitalMap hospitals={hospitals} />
        </div>
        <HospitalListClient hospitals={hospitals} citySlug={citySlug} />
      </div>
    </div>
  );
}
