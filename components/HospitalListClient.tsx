"use client";

import { Disclosure } from "@/components/ui/Disclosure";
import { InsetGroup } from "@/components/ui/InsetGroup";
import { ListRow } from "@/components/ui/ListRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageNotes } from "@/components/ui/PageNotes";
import { PageShell } from "@/components/ui/PageShell";
import { SourceNote } from "@/components/ui/SourceNote";
import UniversalSearch from "@/components/search/UniversalSearch";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

/** One city on the /hospitals hub, counted on the server. */
export type CitySummary = {
  slug: string;
  /** Display name from the directory ("Bangalore"); shown through cityName() (cities.* in translations). */
  label: string;
  count: number;
  /** Bangalore only: hospitals there can carry treatment prices. */
  priced: boolean;
};

/**
 * Client view for /hospitals (the server page passes only the six city
 * counts and the directory date). Hospital-name search uses the static
 * hospital index, fetched on the first focus of the field, so no hospital
 * rows ship with this page.
 */
export default function HospitalListClient({
  cities,
  total,
  directoryDate,
}: {
  cities: CitySummary[];
  total: number;
  directoryDate: string | null;
}) {
  const { t, cityName } = useTranslation();

  return (
    <PageShell>
      <PageHeader
        title={t("hospitals.title")}
        lead={t("hospitals.lead", { n: total.toLocaleString("en-IN"), c: cities.length })}
      >
        {/* -mx-4 lines the summary text up with the H1 (the summary has px-4). */}
        <div className="-mx-4">
          <Disclosure variant="inline" summary={t("hospitals.whatIsList")}>
            <p className="max-w-[65ch]">{t("hospitals.whatIsListBody")}</p>
          </Disclosure>
        </div>
      </PageHeader>

      <div className="space-y-10 md:space-y-16">
        <UniversalSearch variant="hero" scope="hospitals" label={t("hospitals.searchLabel")} />

        <InsetGroup heading={t("hospitals.chooseCity")} headingId="choose-city">
          {cities.map((c) => (
            <ListRow
              key={c.slug}
              href={`/hospitals/${c.slug}`}
              // A city page carries its whole hospital list (up to ~200 KB
              // gzipped), so it is prefetched on intent, not when the row scrolls in.
              prefetch="intent"
              title={cityName(c.label)}
              subtitle={c.priced ? t("hospitals.pricesAvailable") : undefined}
              trailing={
                <>
                  <span aria-hidden="true">{c.count.toLocaleString("en-IN")}</span>
                  <span className="sr-only">{t("hospitals.count", { n: c.count.toLocaleString("en-IN") })}</span>
                </>
              }
            />
          ))}
        </InsetGroup>
      </div>

      <PageNotes anchor="hospitals">
        <SourceNote compact source={t("source.directory")} date={directoryDate} anchor="hospitals" />
      </PageNotes>
    </PageShell>
  );
}
