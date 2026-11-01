"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";

/**
 * Screen-reader-only "(opens in a new tab)" for links with target="_blank".
 * A tiny client leaf, so the links that use it stay server-safe.
 */
export function NewTabNote() {
  const { t } = useTranslation();
  return <span className="sr-only"> {t("common.newTab")}</span>;
}
