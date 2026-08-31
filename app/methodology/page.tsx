"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";

export default function MethodologyPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-sm leading-7 text-ink-700">
      <h1 className="text-2xl font-bold text-ink-900">{t("methodology.title")}</h1>
      <p className="mt-4">{t("methodology.intro")}</p>

      <h2 className="mt-8 text-lg font-semibold text-ink-900">{t("methodology.dirHeading")}</h2>
      <p className="mt-2">{t("methodology.dirBody")}</p>

      <h2 className="mt-8 text-lg font-semibold text-ink-900">{t("methodology.govHeading")}</h2>
      <p className="mt-2">{t("methodology.govBody1")}</p>
      <p className="mt-2">{t("methodology.govBody2")}</p>

      <h2 className="mt-8 text-lg font-semibold text-ink-900">{t("methodology.marketHeading")}</h2>
      <p className="mt-2">{t("methodology.marketBody1")}</p>
      <p className="mt-2">{t("methodology.marketBody2")}</p>

      <h2 className="mt-8 text-lg font-semibold text-ink-900">{t("methodology.nextHeading")}</h2>
      <p className="mt-2">{t("methodology.nextBody")}</p>

      <h2 className="mt-8 text-lg font-semibold text-ink-900">{t("methodology.correctionsHeading")}</h2>
      <p className="mt-2">{t("methodology.correctionsBody")}</p>
    </div>
  );
}
