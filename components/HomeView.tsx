"use client";

import UniversalSearch from "@/components/search/UniversalSearch";
import { InsetGroup } from "@/components/ui/InsetGroup";
import { ListRow } from "@/components/ui/ListRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageNotes } from "@/components/ui/PageNotes";
import { PageShell } from "@/components/ui/PageShell";
import { PrivacyNote } from "@/components/ui/PrivacyNote";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TaskTile } from "@/components/ui/TaskTile";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

/** The only data the home page needs: four counts, computed on the server. */
export type HomeCounts = {
  procedures: number;
  hospitals: number;
  cities: number;
  medicines: number;
};

// "2,684": Latin digits with Indian grouping in both locales (formatINR does the same).
const COUNT = new Intl.NumberFormat("en-IN");

/**
 * Home (§6 "/"): the H1, one lead sentence, the hero search (which renders its
 * own "Try:" chips), three task tiles that go straight to the tools, one short
 * "More" list, one quiet share row and the sources block. Nothing else.
 * Everything is left-aligned in a max-w-read column; only the tile grid uses
 * the max-w-page width, from 1024px.
 */
export default function HomeView({
  counts,
  medicinesDate,
}: {
  counts: HomeCounts;
  /** The Jan Aushadhi list date (MedicinesMeta.janAushadhi.snapshotDate), for the search footer. */
  medicinesDate: string | null;
}) {
  const { t } = useTranslation();
  const p = COUNT.format(counts.procedures);
  const h = COUNT.format(counts.hospitals);
  const c = COUNT.format(counts.cities);
  const m = COUNT.format(counts.medicines);

  return (
    <PageShell width="page">
      <div className="space-y-10 md:space-y-16">
        <div className="max-w-read">
          <PageHeader display title={t("home.title")} lead={t("home.lead")} />
          <UniversalSearch variant="hero" medicinesDate={medicinesDate} />
        </div>

        <section aria-labelledby="home-tasks">
          <SectionHeader id="home-tasks" title={t("home.tasksHeading")} />
          {/* Stacked in the reading column; three across only from 1024px, where each tile still has room for its title. */}
          <div className="grid max-w-read gap-3 lg:max-w-none lg:grid-cols-3 lg:gap-4">
            <TaskTile
              level={3}
              href="/check-quote"
              icon="clipboard"
              title={t("nav.checkQuote")}
              body={t("home.tileQuoteBody")}
            />
            <TaskTile
              level={3}
              href="/check-bill"
              icon="receipt"
              title={t("nav.checkBill")}
              body={t("home.tileBillBody")}
              note={<PrivacyNote>{t("home.actionPrivate")}</PrivacyNote>}
            />
            <TaskTile
              level={3}
              href="/medicines"
              icon="pill"
              title={t("nav.findMedicine")}
              body={t("home.tileMedicineBody")}
            />
          </div>
        </section>

        <div className="max-w-read space-y-8">
          <InsetGroup heading={t("home.moreHeading")} headingId="home-more">
            <ListRow
              href="/hospitals"
              leading="hospital"
              title={t("nav.findHospital")}
              subtitle={<span className="tabular-nums">{t("home.moreHospitalsSub", { h, c })}</span>}
            />
            <ListRow href="/kendras" leading="store" title={t("nav.kendras")} subtitle={t("home.moreKendrasSub")} />
            <ListRow href="/rates" leading="clipboard" title={t("nav.rates")} subtitle={t("home.moreRatesSub")} />
            <ListRow
              href="/methodology"
              leading="source"
              title={t("nav.methodology")}
              subtitle={t("home.moreMethodSub")}
            />
          </InsetGroup>

          <InsetGroup>
            <ListRow href="/share-bill" leading="users" title={t("home.ctaHeading")} subtitle={t("home.shareBody")} />
          </InsetGroup>
        </div>
      </div>

      <div className="max-w-read">
        <PageNotes anchor="market-prices">
          <p className="tabular-nums">{t("home.coverage", { p, m, h, c })}</p>
          <p>{t("home.sourcesLabel")}</p>
        </PageNotes>
      </div>
    </PageShell>
  );
}
