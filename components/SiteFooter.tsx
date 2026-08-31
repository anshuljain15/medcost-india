"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export default function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-ink-100 bg-ink-50">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-ink-500">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-bold text-ink-900">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-500" />
              MedCost India
            </div>
            <p className="mt-2 max-w-xs">{t("footer.tagline")}</p>
          </div>
          <div className="flex gap-12">
            <div>
              <div className="font-semibold text-ink-900">{t("footer.explore")}</div>
              <ul className="mt-2 space-y-1">
                <li><Link href="/procedures" className="hover:text-brand-700">{t("nav.procedures")}</Link></li>
                <li><Link href="/hospitals" className="hover:text-brand-700">{t("nav.hospitals")}</Link></li>
                <li><Link href="/rates" className="hover:text-brand-700">{t("nav.rates")}</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-ink-900">{t("footer.about")}</div>
              <ul className="mt-2 space-y-1">
                <li><Link href="/methodology" className="hover:text-brand-700">{t("nav.methodology")}</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs">
            <a
              href="https://github.com/anshuljain15"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-brand-700"
            >
              {t("footer.credit")}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
