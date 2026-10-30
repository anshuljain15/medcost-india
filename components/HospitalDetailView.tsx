"use client";

import Link from "next/link";
import type { Hospital, HospitalReviews, JanAushadhiKendra, Procedure } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import HospitalReviewsSection from "@/components/HospitalReviews";
import { KendraRow } from "@/components/KendraFinder";

type NearbyKendraSlice = { samePin: JanAushadhiKendra[]; samePostalArea: JanAushadhiKendra[] };

export default function HospitalDetailView({
  hospital,
  citySlug,
  procedures,
  reviews,
  kendras,
}: {
  hospital: Hospital;
  citySlug: string;
  procedures: Procedure[];
  reviews: HospitalReviews | null;
  kendras: NearbyKendraSlice;
}) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/hospitals/${citySlug}`} className="text-sm text-brand-700 hover:underline">
        {t("hospital.backTo", { city: hospital.city })}
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-ink-900">{hospital.name}</h1>
      <p className="mt-1 text-ink-700">{hospital.address}</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <Field label={t("hospital.networkType")} value={hospital.networkType} />
        <Field label={t("hospital.bedCount")} value={hospital.bedCount} />
        <Field label={t("hospital.icuBeds")} value={hospital.icuBeds} />
        <Field label={t("hospital.phone")} value={hospital.phone} />
        <Field label={t("hospital.pincode")} value={hospital.pincode} />
        <Field label={t("hospital.rohiniCode")} value={hospital.rohiniCode} />
      </dl>

      {procedures.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-ink-900">{t("hospital.proceduresHeading")}</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-ink-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3">{t("hospital.procedureColumn")}</th>
                  <th className="px-4 py-3">{t("procedure.colMin")}</th>
                  <th className="px-4 py-3">{t("procedure.colAvg")}</th>
                  <th className="px-4 py-3">{t("procedure.colMax")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {procedures.map((p) => {
                  const hp = p.hospitalPrices.find((x) => x.hospitalSlug === hospital.slug)!;
                  return (
                    <tr key={p.slug}>
                      <td className="px-4 py-3 font-medium text-ink-900">
                        <Link href={`/procedures/${p.slug}`} className="text-brand-700 hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{formatINR(hp.min)}</td>
                      <td className="px-4 py-3">{formatINR(hp.avg)}</td>
                      <td className="px-4 py-3">{formatINR(hp.max)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-ink-300 p-4 text-sm text-ink-500">
          {t("hospital.noProceduresPre")}{" "}
          <Link href="/procedures" className="underline">
            {t("hospital.allProcedures")}
          </Link>{" "}
          {t("hospital.noProceduresPost")}
        </div>
      )}

      {reviews && <HospitalReviewsSection reviews={reviews} />}

      <NearbyKendras pincode={hospital.pincode} kendras={kendras} />
    </div>
  );
}

function NearbyKendras({ pincode, kendras }: { pincode: string | null; kendras: NearbyKendraSlice }) {
  const { t } = useTranslation();
  const none = kendras.samePin.length === 0 && kendras.samePostalArea.length === 0;

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-ink-900">{t("hospital.kendrasHeading")}</h2>
      {!pincode ? (
        <p className="mt-2 text-sm text-ink-500">{t("hospital.kendrasNoPin")}</p>
      ) : none ? (
        <p className="mt-2 text-sm text-ink-500">{t("hospital.kendrasNone")}</p>
      ) : (
        <>
          {kendras.samePin.length > 0 && (
            <>
              <h3 className="mt-3 text-xs uppercase tracking-wide text-ink-500">
                {t("hospital.kendrasSamePin", { pin: pincode })}
              </h3>
              <ul className="mt-2 divide-y divide-ink-100 rounded-xl border border-ink-100">
                {kendras.samePin.map((k) => (
                  <KendraRow key={k.code} kendra={k} samePin={false} samePinLabel="" />
                ))}
              </ul>
            </>
          )}
          {kendras.samePostalArea.length > 0 && (
            <>
              <h3 className="mt-4 text-xs uppercase tracking-wide text-ink-500">
                {t("hospital.kendrasSameArea", { area: pincode.slice(0, 3) })}
              </h3>
              <ul className="mt-2 divide-y divide-ink-100 rounded-xl border border-ink-100">
                {kendras.samePostalArea.map((k) => (
                  <KendraRow key={k.code} kendra={k} samePin={false} samePinLabel="" />
                ))}
              </ul>
            </>
          )}
        </>
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        {pincode && (
          <Link href={`/kendras?pin=${pincode}`} className="font-medium text-brand-700 hover:underline">
            {t("hospital.kendrasFindMore")} →
          </Link>
        )}
        <Link href="/medicines" className="font-medium text-brand-700 hover:underline">
          {t("hospital.kendrasMedicines")} →
        </Link>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-ink-900">{value ?? "—"}</dd>
    </div>
  );
}
