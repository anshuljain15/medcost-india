"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { LOCALES } from "@/lib/i18n/translations";

export default function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="flex rounded-full border border-ink-300 p-0.5 text-xs font-semibold">
      {LOCALES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLocale(l.code)}
          aria-pressed={locale === l.code}
          className={
            locale === l.code
              ? "rounded-full bg-brand-600 px-2.5 py-1 text-white"
              : "rounded-full px-2.5 py-1 text-ink-700 hover:text-brand-700"
          }
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
