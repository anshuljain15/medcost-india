"use client";

import {
  ButtonLink,
  Callout,
  Card,
  DataText,
  Disclosure,
  InlineLink,
  InsetGroup,
  ListRow,
  Money,
  MoneyRange,
  PageHeader,
  PageNotes,
  PageShell,
  PriceFigure,
  SectionHeader,
  SourceNote,
} from "@/components/ui";
import { formatINR, parseCghsAmount } from "@/lib/format";
import type { CghsRate, Procedure, ProcedureHospitalPrice } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

/** Hospital rows shown before the "Show all" disclosure. */
const VISIBLE_HOSPITALS = 8;

/**
 * One hospital's HexaHealth price. It links to our directory page only when
 * the name matched with certainty (hospitalSlug); otherwise the name is plain
 * text with no chevron, because a guessed link would pin a real price on the
 * wrong branch.
 */
function HospitalRow({ price }: { price: ProcedureHospitalPrice }) {
  const { t } = useTranslation();
  return (
    <ListRow
      href={price.hospitalSlug ? `/hospitals/bangalore/${price.hospitalSlug}` : undefined}
      layout="stack"
      title={<DataText>{price.hospitalName}</DataText>}
      meta={price.avg !== null ? t("procedure.typical", { avg: formatINR(price.avg) }) : undefined}
      trailing={<MoneyRange low={price.min} high={price.max} />}
    />
  );
}

function GovtRate({ cghs, date, url }: { cghs: CghsRate | null; date: string | null; url: string }) {
  const { t } = useTranslation();

  if (!cghs) {
    // No confident match is a real, visible state, never a guessed figure.
    return (
      <Callout tone="info">
        <p>
          {t("procedure.noCghsMatch")}{" "}
          <InlineLink href="/methodology#govt-rates">{t("procedure.howWeMatch")}</InlineLink>
        </p>
      </Callout>
    );
  }

  return (
    <>
      <InsetGroup footer={cghs.nabh ? t("procedure.govTier") : undefined}>
        <ListRow title={t("quote.ward.general")} trailing={<Money value={parseCghsAmount(cghs.generalWard)} />} />
        <ListRow title={t("quote.ward.semiPrivate")} trailing={<Money value={parseCghsAmount(cghs.semiPrivateWard)} />} />
        <ListRow title={t("quote.ward.private")} trailing={<Money value={parseCghsAmount(cghs.privateWard)} />} />
      </InsetGroup>
      {/* Link text is the site (cghs.mohfw.gov.in), never the raw URL. */}
      <SourceNote
        source={new URL(url).hostname}
        href={url}
        qualifier={t("source.cghs")}
        date={date}
        anchor="govt-rates"
      />
      <div className="mt-4">
        <Disclosure variant="inline" summary={t("procedure.cghsWhat")}>
          <p>{t("quote.cghsExplain")}</p>
          <p>
            {t("procedure.matchedLine")} <DataText>{cghs.name}</DataText> ({cghs.code})
          </p>
        </Disclosure>
      </div>
    </>
  );
}

/**
 * /procedures/[slug]: the market estimate first, then the one primary action
 * (check a quote for this treatment), then the CGHS rate and the hospital-wise
 * prices. `procedure.hospitalPrices` arrives sorted by typical price.
 */
export default function ProcedureDetailView({
  procedure,
  hexahealthDate,
  cghsDate,
  cghsUrl,
}: {
  procedure: Procedure;
  /** Retrieval dates; null renders "date not recorded", never a guess. */
  hexahealthDate: string | null;
  cghsDate: string | null;
  /** The CGHS rate list URL recorded in data-pipeline/sources/cghs.py. */
  cghsUrl: string;
}) {
  const { t, dict } = useTranslation();
  const { slug, name, cityLow, cityHigh, sourceUrl, hospitalPrices, cghsReference } = procedure;
  const n = hospitalPrices.length;
  const shown = hospitalPrices.slice(0, VISIBLE_HOSPITALS);
  const rest = hospitalPrices.slice(VISIBLE_HOSPITALS);
  const anyUnlinked = hospitalPrices.some((h) => !h.hospitalSlug);

  return (
    <PageShell>
      <PageHeader
        back={{ href: "/procedures", label: t("procedure.back") }}
        title={<DataText>{name}</DataText>}
        meta={n > 0 ? t("procedure.meta", { n }) : t("procedure.metaNoHospitals")}
      />

      <Card>
        <PriceFigure
          label={t("procedure.marketRange")}
          low={cityLow}
          high={cityHigh}
          qualifier={t("source.marketQualifier")}
        >
          <SourceNote source="HexaHealth" href={sourceUrl} date={hexahealthDate} anchor="market-prices" />
        </PriceFigure>
      </Card>

      <div className="mt-6">
        <ButtonLink href={`/check-quote#${slug}`} size="lg" block>
          {t("procedure.checkQuote")}
        </ButtonLink>
      </div>

      <div className="mt-10 space-y-10 md:mt-16 md:space-y-16">
        <section aria-labelledby="govt-rate-heading">
          <SectionHeader id="govt-rate-heading" title={t("procedure.govHeading")} />
          <GovtRate cghs={cghsReference} date={cghsDate} url={cghsUrl} />
        </section>

        <section id="hospitals" aria-labelledby="hospitals-heading">
          <SectionHeader id="hospitals-heading" title={t("procedure.hospitalsHeading", { n })} />
          {n === 0 ? (
            <Callout tone="info">
              <p>{t("procedure.noHospitalData")}</p>
            </Callout>
          ) : (
            <>
              <p className="mb-3 text-footnote text-label-2">{t("procedure.sortNote")}</p>
              <InsetGroup>
                {shown.map((h, i) => (
                  <HospitalRow key={`${i}-${h.hospitalName}`} price={h} />
                ))}
              </InsetGroup>
              {rest.length > 0 && (
                <div className="mt-3">
                  <Disclosure summary={t("procedure.showAllHospitals", { n })}>
                    <ul className="-mx-4 -mb-4 overflow-hidden rounded-b-card border-t border-hairline">
                      {rest.map((h, i) => (
                        <HospitalRow key={`${i + VISIBLE_HOSPITALS}-${h.hospitalName}`} price={h} />
                      ))}
                    </ul>
                  </Disclosure>
                </div>
              )}
              {anyUnlinked && <p className="px-4 pt-2 text-footnote text-label-2">{t("procedure.unlinkedNote")}</p>}
              <SourceNote
                source="HexaHealth"
                href={sourceUrl}
                qualifier={t("source.marketQualifier")}
                date={hexahealthDate}
                anchor="market-prices"
              />
            </>
          )}
        </section>

        <div className="space-y-4">
          <Disclosure summary={t("procedure.askHeading")}>
            <ul className="list-disc space-y-2 pl-5 marker:text-label-3">
              {dict.quote.askList.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            <p>{t("quote.rights")}</p>
          </Disclosure>
          <InsetGroup>
            <ListRow href="/share-bill" leading="users" title={t("procedure.shareRow")} />
          </InsetGroup>
        </div>
      </div>

      <PageNotes anchor="market-prices">
        <p>{t("procedure.footerNote")}</p>
      </PageNotes>
    </PageShell>
  );
}
