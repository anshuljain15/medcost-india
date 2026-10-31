"use client";

import Link from "next/link";
import { getAllProcedures } from "@/lib/data";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import ProcedureSearch from "@/components/ProcedureSearch";

export default function Home() {
  const { t } = useTranslation();
  const procedures = getAllProcedures();

  const actions = [
    { href: "/check-quote", title: t("home.actionQuoteTitle"), body: t("home.actionQuoteBody"), note: null },
    { href: "/check-bill", title: t("home.actionBillTitle"), body: t("home.actionBillBody"), note: t("home.actionPrivate") },
    { href: "/share-bill", title: t("home.actionShareTitle"), body: t("home.actionShareBody"), note: null },
  ];

  return (
    <div>
      <section className="border-b border-ink-100 bg-gradient-to-b from-brand-50 to-background px-4 pb-16 pt-16 sm:pt-20">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <p className="rounded-full bg-brand-100 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-brand-800">
            {t("home.eyebrow")}
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
            {t("home.title")}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-700">{t("home.subtitle")}</p>

          <div className="mt-10 grid w-full gap-4 text-left sm:grid-cols-3">
            {actions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group flex flex-col rounded-2xl border border-brand-200 bg-surface p-5 shadow-sm transition hover:border-brand-500 hover:shadow-md"
              >
                <div className="flex items-center justify-between font-semibold text-ink-900">
                  {a.title}
                  <span className="text-brand-600 transition group-hover:translate-x-1">→</span>
                </div>
                <p className="mt-2 text-sm text-ink-700">{a.body}</p>
                {a.note && <p className="mt-auto pt-3 text-xs font-medium text-brand-700">{a.note}</p>}
              </Link>
            ))}
          </div>

          <p className="mt-12 text-sm font-medium text-ink-500">{t("home.orSearch")}</p>
          <div className="mt-3 flex w-full justify-center">
            <ProcedureSearch procedures={procedures} />
          </div>
          <p className="mt-6 text-xs text-ink-500">
            {t("home.sourcesLabel")}{" "}
            <Link href="/methodology" className="font-medium text-brand-700 hover:underline">
              {t("home.howWeWork")}
            </Link>
          </p>
        </div>
      </section>

      <section className="bg-contrast px-4 py-14 text-contrast-fg">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h2 className="text-2xl font-bold">{t("home.ctaHeading")}</h2>
            <p className="mt-2 max-w-md text-[#cbd5e1]">{t("home.ctaBody")}</p>
          </div>
          <Link
            href="/share-bill"
            className="shrink-0 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-[#0f172a] hover:bg-brand-400"
          >
            {t("home.ctaButton")}
          </Link>
        </div>
      </section>
    </div>
  );
}
