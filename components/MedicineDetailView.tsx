"use client";

import type {
  MedicineBrand,
  MedicineForm,
  MedicineGroup,
  MedicineGroupLink,
  MedicineRelease,
  MedicinesMeta,
} from "@/lib/types";
import { formatINR, formatINRUnit } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import {
  Badge,
  Callout,
  Card,
  DataText,
  Disclosure,
  InsetGroup,
  ListRow,
  Money,
  PageHeader,
  PageNotes,
  PageShell,
  PriceCompare,
  PriceFigure,
  SectionHeader,
  SourceNote,
} from "@/components/ui";
import { KendraLookup } from "@/components/KendraFinder";

// One composition (exact salt + strength + form + release). Everything here
// arrives as props from the server page; lib/medicines.ts never reaches the
// browser. Brand MRPs are a Nov 2022 snapshot and Jan Aushadhi / NPPA prices
// are current, so they are compared only as "typical brand vs generic", never
// drawn against the NPPA ceiling.

const BRANDS_VISIBLE = 10;

const FORM_KEY: Record<MedicineForm, string> = {
  tablet: "medicines.form.tablet",
  capsule: "medicines.form.capsule",
};

const RELEASE_KEY: Record<MedicineRelease, string> = {
  standard: "medicines.release.standard",
  modified: "medicines.release.modified",
  dispersible: "medicines.release.dispersible",
  "mouth-dissolving": "medicines.release.mouth-dissolving",
  chewable: "medicines.release.chewable",
  effervescent: "medicines.release.effervescent",
};

const SAME_KEYS = ["medicines.same.salt", "medicines.same.strength", "medicines.same.form"];

/** "₹2.50 per tablet, excluding GST" with the price left out: " per tablet, excluding GST" -> "Per tablet, excluding GST". */
function phrase(s: string): string {
  const v = s.replace(/\s+/g, " ").trim();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export default function MedicineDetailView({ group, meta }: { group: MedicineGroup; meta: MedicinesMeta }) {
  const { t } = useTranslation();
  const unit = t(`medicines.unit.${group.form}`);
  const perUnitWord = t("medicines.jaPerUnit", { price: "", unit }).trim();

  const jaPrices = group.janAushadhi.map((p) => p.perUnit).filter((n): n is number => n !== null);
  const ja = jaPrices.length > 0 ? Math.min(...jaPrices) : null;
  const hasJaProduct = group.janAushadhi.length > 0;
  const median = group.brandPerUnit?.median ?? null;
  const savingsPct = ja !== null && median !== null && ja < median ? Math.round((1 - ja / median) * 100) : null;
  const ceiling = group.nppaCeiling;

  const firstBrands = group.brands.slice(0, BRANDS_VISIBLE);
  const moreBrands = group.brands.slice(BRANDS_VISIBLE);
  const hasRelated = group.relatedStrengths.length > 0 || group.relatedExtraSalt.length > 0;

  const jaSourceNote = (
    <SourceNote
      source={t("medicines.jaSourceName")}
      href={meta.janAushadhi.url}
      date={meta.janAushadhi.snapshotDate}
      anchor="medicines"
    />
  );
  const brandsSourceNote = (
    <SourceNote
      source={meta.brands.name}
      href={meta.brands.url}
      qualifier={t("medicines.brandsQualifier", { license: meta.brands.license })}
      date={meta.brands.snapshotDate}
      anchor="medicines"
    />
  );

  return (
    <PageShell>
      <PageHeader
        back={{ href: "/medicines", label: t("medicines.back") }}
        title={<DataText>{group.title}</DataText>}
        meta={`${t(FORM_KEY[group.form])} · ${t(RELEASE_KEY[group.release])}`}
      >
        {(hasJaProduct || ceiling) && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {/* Neutral: teal marks only things you can press (§0.1.6), and this is a plain label. */}
            {hasJaProduct && <Badge icon="check">{t("medicines.badgeJa")}</Badge>}
            {ceiling && <Badge>{t("medicines.badgeNppa")}</Badge>}
          </div>
        )}
        <p className="text-callout text-label-2">
          {t("medicines.contains")}:{" "}
          <DataText>{group.salts.map((s) => `${s.name} ${s.strength}`).join(" + ")}</DataText>
        </p>
      </PageHeader>

      <div className="space-y-10 md:space-y-16">
        {/* The answer: the generic against the typical brand, per tablet/capsule. */}
        <Card as="section">
          <p className="text-footnote font-semibold text-label-2">{t("medicines.pricePerUnit", { unit })}</p>
          {ja !== null ? (
            <>
              <div className="mt-3">
                <PriceCompare ja={ja} brandMedian={median} unit={group.form} />
              </div>
              {savingsPct !== null && savingsPct > 0 && median !== null && (
                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <p className="text-headline text-label">
                    {t(group.form === "tablet" ? "medicines.for30.tablet" : "medicines.for30.capsule", {
                      ja: formatINR(Math.round(ja * 30)),
                      brand: formatINR(Math.round(median * 30)),
                    })}
                  </p>
                  <Badge tone="success">{t("medicines.lessPct", { pct: savingsPct })}</Badge>
                </div>
              )}
              {/* True by construction: groups are exact composition matches. */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {SAME_KEYS.map((k) => (
                  <Badge key={k} tone="success" icon="check">
                    {t(k)}
                  </Badge>
                ))}
              </div>
              {median !== null && <p className="mt-4 text-footnote text-label-2">{t("medicines.savingsCaveat")}</p>}
              {jaSourceNote}
              {median !== null && brandsSourceNote}
            </>
          ) : (
            <>
              <p className="mt-3 text-body text-label">
                {hasJaProduct ? t("medicines.jaNoPrice") : t("medicines.jaNone")}
              </p>
              {median !== null ? (
                <div className="mt-5">
                  <PriceFigure label={t("medicines.typicalBrand")} low={median} perUnit>
                    {brandsSourceNote}
                  </PriceFigure>
                </div>
              ) : (
                <p className="mt-3 text-callout text-label-2">{t("medicines.brandsNone")}</p>
              )}
            </>
          )}
        </Card>

        {hasJaProduct && (
          <section aria-labelledby="buy-heading">
            <SectionHeader id="buy-heading" title={t("medicines.buyHeading")} />
            <KendraLookup compact idPrefix="buy" />
          </section>
        )}

        <section aria-labelledby="nppa-heading">
          <SectionHeader id="nppa-heading" title={t("medicines.nppaHeading")} />
          {ceiling ? (
            <Card>
              {/* nppaPrice keeps "excluding GST" in one translated string. */}
              <PriceFigure label={phrase(t("medicines.nppaPrice", { price: "", unit }))} low={ceiling.ceilingPrice} perUnit>
                <p className="mt-3 text-body text-label">{t("medicines.nppaExplain")}</p>
                <SourceNote
                  source="NPPA"
                  href={meta.nppa.url}
                  qualifier={t("medicines.nppaSource", {
                    so: ceiling.soNumber,
                    date: ceiling.soDate,
                    nlem: ceiling.nlemVersion ?? "—",
                  })}
                  date={meta.nppa.exportDate}
                  anchor="medicines"
                />
              </PriceFigure>
            </Card>
          ) : (
            <Callout>{t("medicines.nppaNone")}</Callout>
          )}
        </section>

        <section aria-labelledby="brands-heading">
          <SectionHeader id="brands-heading" title={t("medicines.brandsHeading")} />
          {group.brands.length === 0 ? (
            <Callout>{t("medicines.brandsNone")}</Callout>
          ) : (
            <>
              <p className="mb-3 text-footnote text-label-2">
                {t("medicines.brandsShowing", { shown: group.brands.length, total: group.brandCount })}
              </p>
              <InsetGroup>
                {firstBrands.map((b, i) => (
                  <BrandRow key={`${b.name}-${b.packLabel}-${i}`} brand={b} ja={ja} perUnitWord={perUnitWord} />
                ))}
              </InsetGroup>
              {moreBrands.length > 0 && (
                <div className="mt-3">
                  {/* "Show 40 more", not "Show all 50": it opens only the rest, and brands.length
                      is itself capped below brandCount for large groups. */}
                  <Disclosure summary={t("common.showMore", { n: moreBrands.length })}>
                    <ul className="-mx-4 -mb-4 overflow-hidden rounded-b-card border-t border-hairline">
                      {moreBrands.map((b, i) => (
                        <BrandRow key={`${b.name}-${b.packLabel}-${i}`} brand={b} ja={ja} perUnitWord={perUnitWord} />
                      ))}
                    </ul>
                  </Disclosure>
                </div>
              )}
              {brandsSourceNote}
            </>
          )}
        </section>

        {(hasJaProduct || hasRelated) && (
          <div className="space-y-3">
            {hasJaProduct && (
              <Disclosure summary={t("medicines.jaDetails")}>
                {group.janAushadhi.map((p) => (
                  <div key={p.drugCode}>
                    <p className="text-body text-label">
                      <DataText>{p.name}</DataText>
                    </p>
                    <p className="text-callout text-label-2">
                      {p.mrp !== null
                        ? t("medicines.jaPack", { size: p.unitSize, mrp: formatINR(p.mrp) })
                        : t("medicines.jaNoPrice")}
                      {p.perUnit !== null && ` · ${t("medicines.jaPerUnit", { price: formatINRUnit(p.perUnit), unit })}`}
                    </p>
                    <p className="text-footnote text-label-2">
                      {t("medicines.jaCode", { code: p.drugCode })}
                    </p>
                  </div>
                ))}
                {jaSourceNote}
              </Disclosure>
            )}
            {hasRelated && (
              <Disclosure summary={t("medicines.relatedHeading")}>
                {/* A caution, not an "above" result: amber stays reserved for "above" (§0.1.6). */}
                <Callout icon="alert">{t("medicines.relatedNote")}</Callout>
                <RelatedGroup id="related-strengths" title={t("medicines.relatedStrengths")} links={group.relatedStrengths} />
                <RelatedGroup id="related-extra" title={t("medicines.relatedExtraSalt")} links={group.relatedExtraSalt} />
              </Disclosure>
            )}
          </div>
        )}
      </div>

      <PageNotes anchor="medicines" linkKey="medicines.methodologyLink">
        <p>{t("medicines.disclaimer")}</p>
      </PageNotes>
    </PageShell>
  );
}

function BrandRow({ brand, ja, perUnitWord }: { brand: MedicineBrand; ja: number | null; perUnitWord: string }) {
  const { t } = useTranslation();
  const ratio = ja !== null && ja > 0 && brand.perUnit !== null ? brand.perUnit / ja : null;
  let compare: string | null = null;
  if (ratio !== null && ratio >= 2) {
    compare = t("medicines.timesGeneric", { x: ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10 });
  } else if (ratio !== null && Math.round((ratio - 1) * 100) >= 1) {
    compare = t("medicines.morePct", { pct: Math.round((ratio - 1) * 100) });
  }
  const sub = [brand.manufacturer, brand.packLabel].filter(Boolean).join(" · ");

  return (
    <ListRow
      title={<DataText>{brand.name}</DataText>}
      subtitle={sub ? <DataText>{sub}</DataText> : undefined}
      meta={brand.price !== null ? `${t("medicines.colPackPrice")} ${formatINR(brand.price)}` : undefined}
      badges={compare ? <Badge>{compare}</Badge> : undefined}
      trailing={
        <>
          <Money value={brand.perUnit} perUnit />
          {brand.perUnit !== null && <span className="block text-footnote text-label-2">{perUnitWord}</span>}
        </>
      }
    />
  );
}

function RelatedGroup({ id, title, links }: { id: string; title: string; links: MedicineGroupLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="-mx-4 pt-2">
      <InsetGroup heading={title} headingId={id}>
        {links.map((l) => (
          <ListRow key={l.slug} href={`/medicines/${l.slug}`} title={<DataText>{l.title}</DataText>} />
        ))}
      </InsetGroup>
    </div>
  );
}
