"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";

/**
 * Data text (hospital names, addresses, procedure names, compositions) is
 * never translated. translate="no" stops browser auto-translate from mangling
 * it, and under the Hindi UI it is marked lang="en" for screen readers.
 */
export function DataText({ children }: { children: React.ReactNode }) {
  const { locale } = useTranslation();
  return (
    <span translate="no" lang={locale === "hi" ? "en" : undefined}>
      {children}
    </span>
  );
}
