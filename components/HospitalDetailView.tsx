"use client";

import Link from "next/link";
import type { Hospital, Procedure } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export default function HospitalDetailView({
  hospital,
  citySlug,
  procedures,
}: {
  hospital: Hospital;
  citySlug: string;
  procedures: Procedure[];
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
    </div>
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
