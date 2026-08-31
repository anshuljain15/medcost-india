"use client";

import Link from "next/link";
import type { Procedure } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export default function ProcedureDetailView({ procedure }: { procedure: Procedure }) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/procedures" className="text-sm text-brand-700 hover:underline">
        {t("procedure.back")}
      </Link>
      <h1 className="mt-3 text-3xl font-bold text-ink-900">
        {procedure.name} {t("procedure.titleSuffix")}
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-ink-50 p-6">
          <div className="text-xs uppercase tracking-wide text-ink-500">{t("procedure.marketRange")}</div>
          <div className="mt-1 text-2xl font-bold text-ink-900">
            {formatINR(procedure.cityLow)} – {formatINR(procedure.cityHigh)}
          </div>
          <div className="mt-2 text-xs text-ink-500">
            {t("procedure.sourceLabel")}{" "}
            <a href={procedure.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              HexaHealth
            </a>{" "}
            {t("procedure.editorialNote")}
          </div>
        </div>

        {procedure.cghsReference ? (
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-6">
            <div className="text-xs uppercase tracking-wide text-brand-800">{t("procedure.govRefTitle")}</div>
            <div className="mt-1 text-2xl font-bold text-ink-900">
              {formatINR(Number(procedure.cghsReference.generalWard))}
              <span className="ml-2 text-sm font-normal text-ink-500">{t("procedure.generalWardNabh")}</span>
            </div>
            <div className="mt-2 text-xs text-ink-700">
              {t("procedure.matchedLine")} <strong>{procedure.cghsReference.name}</strong> ({procedure.cghsReference.code}).{" "}
              {t("procedure.wardBreakdown", {
                sp: formatINR(Number(procedure.cghsReference.semiPrivateWard)),
                p: formatINR(Number(procedure.cghsReference.privateWard)),
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-ink-300 p-6 text-sm text-ink-500">
            {t("procedure.noCghsMatch")}{" "}
            <Link href="/methodology" className="underline">
              {t("procedure.methodologyLink")}
            </Link>
            .
          </div>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-ink-900">{t("procedure.comparisonHeading")}</h2>
        {procedure.hospitalPrices.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">{t("procedure.noHospitalData")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-ink-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3">{t("procedure.colHospital")}</th>
                  <th className="px-4 py-3">{t("procedure.colMin")}</th>
                  <th className="px-4 py-3">{t("procedure.colAvg")}</th>
                  <th className="px-4 py-3">{t("procedure.colMax")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {procedure.hospitalPrices.map((h, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-ink-900">
                      {h.hospitalSlug ? (
                        <Link href={`/hospitals/bangalore/${h.hospitalSlug}`} className="text-brand-700 hover:underline">
                          {h.hospitalName}
                        </Link>
                      ) : (
                        h.hospitalName
                      )}
                    </td>
                    <td className="px-4 py-3">{formatINR(h.min)}</td>
                    <td className="px-4 py-3">{formatINR(h.avg)}</td>
                    <td className="px-4 py-3">{formatINR(h.max)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-ink-500">
          {t("procedure.sourceLabel")}{" "}
          <a href={procedure.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {procedure.sourceUrl}
          </a>
          . {t("procedure.footerNote")}
        </p>
      </section>
    </div>
  );
}
