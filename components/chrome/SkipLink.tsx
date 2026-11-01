"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";

/** The first focusable element on every page: jumps to <main id="main"> (§7). */
export default function SkipLink() {
  const { t } = useTranslation();
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-[60] focus:inline-flex focus:min-h-12 focus:items-center focus:rounded-full focus:bg-elevated focus:px-5 focus:text-headline focus:text-label focus:shadow-pop"
    >
      {t("nav.skip")}
    </a>
  );
}
