"use client";

import { UNLOCK_BILLS, UNLOCK_BROWSERS } from "@/lib/billReports";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Card, InsetGroup, ListRow, PageHeader, PageShell, SectionHeader, type MethodAnchor } from "@/components/ui";

// "How we get prices" (design spec §6 /methodology): a calm reference page.
// Every section id is a MethodAnchor that SourceNote and PageNotes link to,
// plus "next". The paragraphs are the existing copy, word for word; only the
// order and the headings changed.

const SECTIONS: { id: MethodAnchor | "next"; heading: string; body: string[] }[] = [
  {
    id: "market-prices",
    heading: "methodology.marketHeading",
    body: ["methodology.marketBody1", "methodology.marketBody2"],
  },
  { id: "govt-rates", heading: "methodology.govHeading", body: ["methodology.govBody1", "methodology.govBody2"] },
  { id: "medicines", heading: "methodology.medHeading", body: ["methodology.medBody1", "methodology.medBody2"] },
  { id: "stores", heading: "methodology.storesHeading", body: ["methodology.medBody3"] },
  { id: "checks", heading: "methodology.checkHeading", body: ["methodology.checkBody1", "methodology.checkBody2"] },
  { id: "patient-bills", heading: "methodology.patientHeading", body: ["methodology.patientBody"] },
  { id: "hospitals", heading: "methodology.dirHeading", body: ["methodology.dirBody"] },
  { id: "reviews", heading: "methodology.reviewsHeading", body: ["methodology.reviewsBody"] },
  { id: "dates", heading: "methodology.datesHeading", body: ["methodology.datesBody"] },
  // methodology.correctionsLink (GitHub issues) ships only once the owner
  // confirms the repo is public with Issues enabled (§6); until then the
  // paragraph stands alone.
  { id: "corrections", heading: "methodology.correctionsHeading", body: ["methodology.correctionsBody"] },
  { id: "next", heading: "methodology.nextHeading", body: ["methodology.nextBody"] },
];

const SHORT = ["methodology.short1", "methodology.short2", "methodology.short3"];

export default function MethodologyView() {
  const { t } = useTranslation();
  // methodology.patientBody quotes the unlock rule; it must match bill_stats().
  const vars = { n: UNLOCK_BILLS, b: UNLOCK_BROWSERS };

  return (
    <PageShell>
      <PageHeader back={{ href: "/", label: t("nav.home") }} title={t("methodology.title")} lead={t("methodology.intro")} />

      <div className="space-y-10 md:space-y-16">
        <div className="space-y-8">
          <Card as="section">
            <h2 className="text-headline text-label">{t("methodology.shortHeading")}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-body text-label marker:text-label-3">
              {SHORT.map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ul>
          </Card>

          <nav aria-label={t("methodology.onThisPage")}>
            <InsetGroup heading={t("methodology.onThisPage")}>
              {SECTIONS.map((s) => (
                <ListRow key={s.id} href={`#${s.id}`} title={t(s.heading)} />
              ))}
            </InsetGroup>
          </nav>
        </div>

        {SECTIONS.map((s) => (
          <section key={s.id}>
            <SectionHeader id={s.id} title={t(s.heading)} />
            <div className="max-w-[65ch] space-y-4 text-body text-label">
              {s.body.map((k) => (
                <p key={k}>{t(k, vars)}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
