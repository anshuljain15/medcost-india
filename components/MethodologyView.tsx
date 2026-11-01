"use client";

import { UNLOCK_BILLS, UNLOCK_BROWSERS } from "@/lib/billReports";
import { MEDICINE_DATA_LICENCE_URL } from "@/lib/medicineShards";
import { CORRECTIONS_URL } from "@/lib/nav";
import type { MedicinesMeta } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import {
  Card,
  DataText,
  ExtLink,
  InsetGroup,
  ListRow,
  PageHeader,
  PageShell,
  SectionHeader,
  type MethodAnchor,
} from "@/components/ui";

// "How we get prices" (design spec §6 /methodology): a calm reference page.
// Every section id is a MethodAnchor that SourceNote and PageNotes link to,
// plus "next". The paragraphs are the existing copy; only the order and the
// headings changed. The lead is one sentence so "The short version" is on the
// first phone screen; the longer intro paragraph opens #market-prices, where
// its "one rate, not one per insurer" point belongs.

// Paragraph keys per section; "methodology.brandsAttribution" renders with two links.
const SECTIONS: { id: MethodAnchor | "next"; heading: string; body: string[] }[] = [
  {
    id: "market-prices",
    heading: "methodology.marketHeading",
    body: ["methodology.intro", "methodology.marketBody1", "methodology.marketBody2"],
  },
  { id: "govt-rates", heading: "methodology.govHeading", body: ["methodology.govBody1", "methodology.govBody2"] },
  {
    id: "medicines",
    heading: "methodology.medHeading",
    body: ["methodology.medBody1", "methodology.medBody2", "methodology.brandsAttribution"],
  },
  { id: "stores", heading: "methodology.storesHeading", body: ["methodology.medBody3"] },
  { id: "checks", heading: "methodology.checkHeading", body: ["methodology.checkBody1", "methodology.checkBody2"] },
  { id: "patient-bills", heading: "methodology.patientHeading", body: ["methodology.patientBody"] },
  { id: "hospitals", heading: "methodology.dirHeading", body: ["methodology.dirBody"] },
  { id: "reviews", heading: "methodology.reviewsHeading", body: ["methodology.reviewsBody"] },
  { id: "dates", heading: "methodology.datesHeading", body: ["methodology.datesBody"] },
  // methodology.correctionsLink renders only once lib/nav.ts CORRECTIONS_URL is
  // set (the owner confirms the repo is public with Issues enabled, §6).
  { id: "corrections", heading: "methodology.correctionsHeading", body: ["methodology.correctionsBody"] },
  { id: "next", heading: "methodology.nextHeading", body: ["methodology.nextBody"] },
];

const SHORT = ["methodology.short1", "methodology.short2", "methodology.short3"];

/** Stand-ins for {dataset} and {licence}, so both can be links inside the sentence. */
const DATASET = "\u0000";
const LICENCE = "\u0001";

/**
 * The CC BY-SA 4.0 attribution for the brand MRPs: the dataset by name and
 * author (linked), the licence (linked), and what we changed, as the licence
 * asks.
 */
function BrandsAttribution({ brands }: { brands: MedicinesMeta["brands"] }) {
  const { t } = useTranslation();
  const text = t("methodology.brandsAttribution", { dataset: DATASET, licence: LICENCE });
  const parts = text.split(/(\u0000|\u0001)/);
  return (
    <p>
      {parts.map((part, i) =>
        part === DATASET ? (
          <ExtLink key={i} href={brands.url}>
            <DataText>{brands.name}</DataText>
          </ExtLink>
        ) : part === LICENCE ? (
          <ExtLink key={i} href={MEDICINE_DATA_LICENCE_URL}>
            {brands.license}
          </ExtLink>
        ) : (
          part
        )
      )}
    </p>
  );
}

export default function MethodologyView({ brands }: { brands: MedicinesMeta["brands"] }) {
  const { t } = useTranslation();
  // methodology.patientBody quotes the unlock rule; it must match bill_stats().
  const vars = { n: UNLOCK_BILLS, b: UNLOCK_BROWSERS };

  return (
    <PageShell>
      <PageHeader back={{ href: "/", label: t("nav.home") }} title={t("methodology.title")} lead={t("methodology.lead")} />

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
          // The section is the #anchor target and takes focus (tabIndex -1):
          // Next's router calls focus() on the hash target after scrolling, so
          // "On this page" rows and every SourceNote/PageNotes link from other
          // pages leave keyboard and screen-reader focus here, not behind.
          <section key={s.id} id={s.id} tabIndex={-1} className="focus:outline-none">
            <SectionHeader title={t(s.heading)} />
            <div className="max-w-[65ch] space-y-4 text-body text-label">
              {s.body.map((k) =>
                k === "methodology.brandsAttribution" ? (
                  <BrandsAttribution key={k} brands={brands} />
                ) : (
                  <p key={k}>{t(k, vars)}</p>
                )
              )}
              {s.id === "corrections" && CORRECTIONS_URL && (
                <p>
                  <ExtLink href={CORRECTIONS_URL}>{t("methodology.correctionsLink")}</ExtLink>
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
