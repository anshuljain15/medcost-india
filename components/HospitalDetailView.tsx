"use client";

import type { Hospital, HospitalReviews, JanAushadhiKendra } from "@/lib/types";
import { cleanCode, cleanCount, formatINR, telHref } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { ActionLink } from "@/components/ui/ActionLink";
import { ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { DataText } from "@/components/ui/DataText";
import { Disclosure } from "@/components/ui/Disclosure";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { InsetGroup } from "@/components/ui/InsetGroup";
import { ListRow } from "@/components/ui/ListRow";
import { MoneyRange } from "@/components/ui/Money";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageNotes } from "@/components/ui/PageNotes";
import { PageShell } from "@/components/ui/PageShell";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SourceNote } from "@/components/ui/SourceNote";
import HospitalReviewsSection from "@/components/HospitalReviews";

/** This hospital's own HexaHealth price for one treatment, sliced on the server. */
export type HospitalPriceRow = {
  slug: string;
  name: string;
  min: number | null;
  max: number | null;
  avg: number | null;
};

type NearbyKendras = { samePin: JanAushadhiKendra[]; samePostalArea: JanAushadhiKendra[] };
type T = (key: string, vars?: Record<string, string | number>) => string;

/** A phone field with fewer than 8 digits is junk ("0-0", "-91", "-DHS/NH/1262"): no row, no button. */
function usablePhone(phone: string | null): string | null {
  if (!phone) return null;
  return phone.replace(/\D/g, "").length >= 8 ? phone.trim() : null;
}

function directionsHref(h: Hospital): string {
  const query =
    h.lat != null && h.lon != null
      ? `${h.lat},${h.lon}`
      : [h.name, h.address, h.pincode].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function HospitalDetailView({
  hospital,
  citySlug,
  prices,
  reviews,
  kendras,
  dates,
}: {
  hospital: Hospital;
  citySlug: string;
  prices: HospitalPriceRow[];
  reviews: HospitalReviews | null;
  kendras: NearbyKendras;
  dates: { hexahealth: string | null; directory: string | null };
}) {
  const { t } = useTranslation();
  const tel = telHref(hospital.phone);

  return (
    <PageShell>
      <PageHeader
        back={{ href: `/hospitals/${citySlug}`, label: t("hospital.backTo", { city: hospital.city }) }}
        title={<DataText>{hospital.name}</DataText>}
        meta={hospital.address ? <DataText>{hospital.address}</DataText> : undefined}
      >
        <div className="flex flex-wrap gap-2">
          {/* No Call button for a number we can't dial correctly: a wrong number is worse than none. */}
          {tel && (
            <ButtonLink variant="tonal" icon="phone" href={tel}>
              {t("common.call")}
            </ButtonLink>
          )}
          <ButtonLink variant="tonal" icon="directions" href={directionsHref(hospital)} external>
            {t("common.directions")}
          </ButtonLink>
        </div>
      </PageHeader>

      <div className="space-y-10 md:space-y-16">
        <AboutGroup hospital={hospital} t={t} />
        <TreatmentPrices
          citySlug={citySlug}
          cityLabel={hospital.city}
          prices={prices}
          hexahealthDate={dates.hexahealth}
          t={t}
        />
        {reviews && <HospitalReviewsSection reviews={reviews} />}
        <NearbyKendrasSection pincode={hospital.pincode} kendras={kendras} t={t} />
        <InsetGroup>
          <ListRow href="/share-bill" leading="receipt" title={t("hospital.shareHere")} />
        </InsetGroup>
      </div>

      <PageNotes anchor="hospitals">
        <SourceNote compact source={t("source.directory")} date={dates.directory} anchor="hospitals" />
      </PageNotes>
    </PageShell>
  );
}

/** Rows only for values we have; never a "—". */
function AboutGroup({ hospital, t }: { hospital: Hospital; t: T }) {
  const beds = cleanCount(hospital.bedCount);
  const icu = cleanCount(hospital.icuBeds);
  const nabh = hospital.nabhFlag?.trim().toUpperCase() === "Y";
  const phone = usablePhone(hospital.phone);
  const rohini = cleanCode(hospital.rohiniCode);
  const network = hospital.networkType?.trim() || null;
  const hasRows = beds !== null || icu !== null || nabh || Boolean(hospital.pincode) || phone !== null;
  const hasInsurance = network !== null || rohini !== null;
  if (!hasRows && !hasInsurance) return null;

  return (
    <InsetGroup heading={t("hospital.about")} headingId="about-hospital">
      {beds !== null && <ListRow title={t("hospital.bedCount")} trailing={beds.toLocaleString("en-IN")} />}
      {icu !== null && <ListRow title={t("hospital.icuBeds")} trailing={icu.toLocaleString("en-IN")} />}
      {nabh && (
        <ListRow
          title={t("hospital.nabh")}
          trailing={<Icon name="check-circle" className="size-5 text-label-2" />}
        />
      )}
      {hospital.pincode && <ListRow title={t("hospital.pincode")} trailing={hospital.pincode} />}
      {phone && <ListRow layout="stack" title={t("hospital.phone")} trailing={<DataText>{phone}</DataText>} />}
      {hasInsurance && (
        // -mt-px lays the disclosure's top hairline over the last row's separator.
        <li className="-mt-px">
          <Disclosure variant="inline" summary={t("hospital.insuranceDetails")}>
            <dl className="space-y-3">
              {network && (
                <div>
                  <dt className="text-callout text-label-2">{t("hospital.networkType")}</dt>
                  <dd className="text-body text-label">
                    <DataText>{network}</DataText>
                  </dd>
                </div>
              )}
              {rohini && (
                <div>
                  <dt className="text-callout text-label-2">{t("hospital.rohiniCode")}</dt>
                  <dd className="text-body tabular-nums text-label">
                    <DataText>{rohini}</DataText>
                  </dd>
                  <dd className="mt-1 text-footnote text-label-2">{t("hospital.rohiniHint")}</dd>
                </div>
              )}
            </dl>
          </Disclosure>
        </li>
      )}
    </InsetGroup>
  );
}

function TreatmentPrices({
  citySlug,
  cityLabel,
  prices,
  hexahealthDate,
  t,
}: {
  citySlug: string;
  cityLabel: string;
  prices: HospitalPriceRow[];
  hexahealthDate: string | null;
  t: T;
}) {
  // The Bangalore gate (also applied on the server): other cities have no
  // prices at all, so they get no link to Bangalore estimates either.
  if (citySlug !== "bangalore") {
    return (
      <section aria-labelledby="hospital-prices">
        <SectionHeader id="hospital-prices" title={t("hospital.proceduresHeading")} />
        <Callout>{t("hospital.noPricesCity", { city: cityLabel })}</Callout>
      </section>
    );
  }

  if (prices.length === 0) {
    return (
      <section aria-labelledby="hospital-prices">
        <SectionHeader id="hospital-prices" title={t("hospital.proceduresHeading")} />
        <Callout>{t("hospital.noPricesHere")}</Callout>
        <div className="mt-2">
          <ActionLink href="/procedures">{t("hospital.seeUsual")}</ActionLink>
        </div>
      </section>
    );
  }

  const quoteHref = prices.length === 1 ? `/check-quote#${prices[0].slug}` : "/check-quote";
  return (
    <section aria-labelledby="hospital-prices">
      <SectionHeader id="hospital-prices" title={t("hospital.proceduresHeading")} />
      <InsetGroup>
        {prices.map((p) => (
          <ListRow
            key={p.slug}
            href={`/procedures/${p.slug}`}
            layout="stack"
            title={<DataText>{p.name}</DataText>}
            meta={p.avg !== null ? t("procedure.typical", { avg: formatINR(p.avg) }) : undefined}
            trailing={<MoneyRange low={p.min} high={p.max} />}
          />
        ))}
      </InsetGroup>
      <SourceNote
        source="HexaHealth"
        qualifier={t("source.marketQualifier")}
        date={hexahealthDate}
        anchor="market-prices"
      />
      <div className="mt-2">
        <ActionLink href={quoteHref}>{t("hospital.checkQuote")}</ActionLink>
      </div>
    </section>
  );
}

function NearbyKendrasSection({ pincode, kendras, t }: { pincode: string | null; kendras: NearbyKendras; t: T }) {
  const none = kendras.samePin.length === 0 && kendras.samePostalArea.length === 0;

  return (
    <section aria-labelledby="hospital-kendras">
      <SectionHeader id="hospital-kendras" title={t("hospital.kendrasHeading")} />
      {!pincode ? (
        <p className="max-w-[65ch] text-body text-label-2">{t("hospital.kendrasNoPin")}</p>
      ) : none ? (
        <p className="max-w-[65ch] text-body text-label-2">{t("hospital.kendrasNone")}</p>
      ) : (
        <div className="space-y-6">
          {kendras.samePin.length > 0 && (
            <KendraGroup id="kendras-same-pin" heading={t("hospital.kendrasSamePin", { pin: pincode })} rows={kendras.samePin} t={t} />
          )}
          {kendras.samePostalArea.length > 0 && (
            <KendraGroup
              id="kendras-same-area"
              heading={t("hospital.kendrasSameArea", { area: pincode.slice(0, 3) })}
              rows={kendras.samePostalArea}
              t={t}
            />
          )}
        </div>
      )}
      <div className="mt-3 flex flex-col items-start">
        {pincode && <ActionLink href={`/kendras?pin=${pincode}`}>{t("hospital.kendrasFindMore")}</ActionLink>}
        <ActionLink href="/medicines">{t("hospital.kendrasMedicines")}</ActionLink>
      </div>
    </section>
  );
}

/**
 * InsetGroup's own heading is an h2; these sit under the section's h2, so the
 * recipe's heading is repeated here as an h3 above a heading-less InsetGroup.
 */
function KendraGroup({ id, heading, rows, t }: { id: string; heading: string; rows: JanAushadhiKendra[]; t: T }) {
  return (
    <div>
      <h3 id={id} className="px-4 pb-2 text-footnote font-semibold text-label-2">
        {heading}
      </h3>
      <InsetGroup>
        {rows.map((k) => (
          <KendraRow key={k.code} kendra={k} t={t} />
        ))}
      </InsetGroup>
    </div>
  );
}

/**
 * The /kendras row recipe (§6): address, district + state, PIN + store code,
 * and a directions button. No distance claims and no operator names.
 */
function KendraRow({ kendra, t }: { kendra: JanAushadhiKendra; t: T }) {
  const place = [kendra.district, kendra.state].filter(Boolean).join(", ");
  const meta = [kendra.pincode && t("city.pin", { pin: kendra.pincode }), t("kendras.storeCode", { code: kendra.code })]
    .filter(Boolean)
    .join(" · ");
  const query = [kendra.address, place, kendra.pincode].filter(Boolean).join(", ");
  return (
    <ListRow
      title={kendra.address ? <DataText>{kendra.address}</DataText> : t("kendras.storeCode", { code: kendra.code })}
      subtitle={place ? <DataText>{place}</DataText> : undefined}
      meta={kendra.address ? meta : kendra.pincode ? t("city.pin", { pin: kendra.pincode }) : undefined}
      trailing={
        query ? (
          <IconButton
            icon="directions"
            label={`${t("common.directions")}: ${kendra.address ?? kendra.code}`}
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
          />
        ) : undefined
      }
    />
  );
}
