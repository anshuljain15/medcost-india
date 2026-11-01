"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { LOCALES } from "@/lib/i18n/translations";

/**
 * One pill naming the other language in its own script ("हिंदी" / "English"),
 * read as "Change language: हिंदी".
 */
export function LanguageSwitch() {
  const { locale, setLocale, t } = useTranslation();
  const other = locale === "hi" ? "en" : "hi";
  const name = LOCALES.find((l) => l.code === other)?.name ?? other;
  return (
    <button
      type="button"
      onClick={() => setLocale(other)}
      className="inline-flex min-h-11 items-center rounded-full bg-fill px-4 text-callout font-semibold text-label transition-colors duration-150 hover:bg-accent-soft hover:text-accent-strong"
    >
      <span className="sr-only">{t("nav.languageSwitch")} </span>
      <span lang={other}>{name}</span>
    </button>
  );
}
