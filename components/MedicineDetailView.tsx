"use client";

import Link from "next/link";
import type { MedicineGroup, MedicineGroupLink, MedicinesMeta } from "@/lib/types";
import { formatINR, formatINRUnit, formatISODate } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export default function MedicineDetailView({
  group,
  meta,
}: {
  group: MedicineGroup;
  meta: MedicinesMeta;
}) {
  const { t } = useTranslation();
  const unit = t(`medicines.unit.${group.form}`);
  const cheapestJa = group.janAushadhi.find((p) => p.perUnit !== null)?.perUnit ?? null;
  const median = group.brandPerUnit?.median ?? null;
  const savingsPct =
    cheapestJa !== null && median !== null && cheapestJa < median
      ? Math.round((1 - cheapestJa / median) * 100)
      : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/medicines" className="text-sm text-brand-700 hover:underline">
        {t("medicines.back")}
      </Link>
      <h1 className="mt-3 text-3xl font-bold text-ink-900">{group.title}</h1>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-800">
          {t(`medicines.form.${group.form}`)}
        </span>
        <span className="rounded-full bg-ink-50 px-2.5 py-1 font-medium text-ink-700">
          {t(`medicines.release.${group.release}`)}
        </span>
      </div>
      <p className="mt-3 text-sm text-ink-700">
        {t("medicines.contains")}:{" "}
        {group.salts.map((s) => `${s.name} ${s.strength}`).join(" + ")}
      </p>

      {savingsPct !== null && (
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-ink-900">
          {t("medicines.savingsLine", {
            ja: formatINRUnit(cheapestJa),
            brand: formatINRUnit(median),
            unit,
            pct: savingsPct,
          })}
          <div className="mt-1 text-xs text-ink-500">{t("medicines.savingsCaveat")}</div>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-brand-200 bg-surface p-6">
          <div className="text-xs uppercase tracking-wide text-brand-800">{t("medicines.jaHeading")}</div>
          {group.janAushadhi.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">{t("medicines.jaNone")}</p>
          ) : (
            <ul className="mt-2 space-y-4">
              {group.janAushadhi.map((p) => (
                <li key={p.drugCode}>
                  <div className="text-2xl font-bold text-ink-900">
                    {p.perUnit !== null ? t("medicines.jaPerUnit", { price: formatINRUnit(p.perUnit), unit }) : "—"}
                  </div>
                  <div className="mt-1 text-sm text-ink-700">{p.name}</div>
                  <div className="mt-1 text-xs text-ink-500">
                    {p.mrp !== null
                      ? t("medicines.jaPack", { size: p.unitSize, mrp: formatINR(p.mrp) })
                      : t("medicines.jaNoPrice")}
                    {" · "}PMBJP #{p.drugCode}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 text-xs text-ink-500">
            {t("medicines.jaSource", { date: formatISODate(meta.janAushadhi.snapshotDate) })}{" "}
            <a href={meta.janAushadhi.url} target="_blank" rel="noopener noreferrer" className="underline">
              janaushadhi.gov.in
            </a>
          </div>
          <Link href="/kendras" className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">
            {t("medicines.findKendra")}
          </Link>
        </div>

        <div className="rounded-xl border border-ink-100 bg-ink-50 p-6">
          <div className="text-xs uppercase tracking-wide text-ink-500">{t("medicines.nppaHeading")}</div>
          {group.nppaCeiling ? (
            <>
              <div className="mt-1 text-2xl font-bold text-ink-900">
                {t("medicines.nppaPrice", { price: formatINRUnit(group.nppaCeiling.ceilingPrice), unit })}
              </div>
              <p className="mt-2 text-sm text-ink-700">{t("medicines.nppaExplain")}</p>
              <div className="mt-2 text-xs text-ink-500">
                {group.nppaCeiling.formulation} · {group.nppaCeiling.dosage}
                <br />
                {t("medicines.nppaSource", {
                  so: group.nppaCeiling.soNumber,
                  date: group.nppaCeiling.soDate,
                  nlem: group.nppaCeiling.nlemVersion ?? "—",
                })}{" "}
                ·{" "}
                <a href={meta.nppa.url} target="_blank" rel="noopener noreferrer" className="underline">
                  nppaindia.nic.in
                </a>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-500">{t("medicines.nppaNone")}</p>
          )}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-ink-900">{t("medicines.brandsHeading")}</h2>
        {group.brands.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">{t("medicines.brandsNone")}</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-500">
              {t("medicines.brandsShowing", { shown: group.brands.length, total: group.brandCount })}
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-ink-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-3">{t("medicines.colBrand")}</th>
                    <th className="hidden px-4 py-3 sm:table-cell">{t("medicines.colMaker")}</th>
                    <th className="hidden px-4 py-3 sm:table-cell">{t("medicines.colPack")}</th>
                    <th className="px-4 py-3">{t("medicines.colPackPrice")}</th>
                    <th className="px-4 py-3">{t("medicines.colPerUnit")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {group.brands.map((b, i) => (
                    <tr key={`${b.name}-${b.packLabel}-${i}`}>
                      <td className="px-4 py-3 font-medium text-ink-900">{b.name}</td>
                      <td className="hidden px-4 py-3 text-ink-700 sm:table-cell">{b.manufacturer ?? "—"}</td>
                      <td className="hidden px-4 py-3 text-ink-700 sm:table-cell">{b.packLabel}</td>
                      <td className="px-4 py-3">{formatINR(b.price)}</td>
                      <td className="px-4 py-3">{formatINRUnit(b.perUnit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="mt-3 text-xs text-ink-500">
          {t("medicines.brandsSource", {
            name: meta.brands.name,
            date: formatISODate(meta.brands.snapshotDate),
            license: meta.brands.license,
          })}{" "}
          <a href={meta.brands.url} target="_blank" rel="noopener noreferrer" className="underline">
            Kaggle
          </a>
        </p>
      </section>

      {(group.relatedStrengths.length > 0 || group.relatedExtraSalt.length > 0) && (
        <section className="mt-10 grid gap-6 sm:grid-cols-2">
          <RelatedList title={t("medicines.relatedStrengths")} links={group.relatedStrengths} />
          <RelatedList title={t("medicines.relatedExtraSalt")} links={group.relatedExtraSalt} />
          <p className="text-xs text-ink-500 sm:col-span-2">{t("medicines.relatedNote")}</p>
        </section>
      )}

      <p className="mt-10 rounded-xl border border-dashed border-ink-300 p-4 text-sm text-ink-700">
        {t("medicines.disclaimer")}{" "}
        <Link href="/methodology" className="underline">
          {t("medicines.methodologyLink")}
        </Link>
        .
      </p>
    </div>
  );
}

function RelatedList({ title, links }: { title: string; links: MedicineGroupLink[] }) {
  if (links.length === 0) return null;
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {links.map((l) => (
          <li key={l.slug}>
            <Link href={`/medicines/${l.slug}`} className="text-brand-700 hover:underline">
              {l.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
