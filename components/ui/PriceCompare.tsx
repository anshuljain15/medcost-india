"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Money } from "./Money";

/**
 * Per-unit Jan Aushadhi price against the typical (median) brand MRP, as two
 * labelled values with bars on one shared axis. The NPPA ceiling is never drawn
 * here: it is a different kind of number from 2022 brand MRPs.
 */
export function PriceCompare({
  ja,
  brandMedian,
  unit,
}: {
  ja: number | null;
  brandMedian: number | null;
  unit: "tablet" | "capsule";
}) {
  const { t } = useTranslation();
  // "per tablet" / "प्रति गोली", read after each value by screen readers only
  // (the visible label above the block already says "Price per tablet").
  const perUnit = t("medicines.jaPerUnit", { price: "", unit: t(`medicines.unit.${unit}`) }).trim();
  const max = Math.max(ja ?? 0, brandMedian ?? 0);
  const width = (v: number | null) => (v !== null && max > 0 ? `${Math.max((v / max) * 100, 2)}%` : "0%");

  const rows = [
    { key: "ja", label: t("medicines.jaHeading"), value: ja, bar: "bg-range-band" },
    { key: "brand", label: t("medicines.typicalBrand"), value: brandMedian, bar: "bg-label-3" },
  ];

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
          <span className="text-callout text-label">{r.label}</span>
          <span className="text-headline tabular-nums text-label">
            <Money value={r.value} perUnit />
            {r.value !== null && <span className="sr-only"> {perUnit}</span>}
          </span>
          <div aria-hidden="true" className="col-span-2 mt-1.5 h-2 rounded-full bg-fill">
            {r.value !== null && <div className={`h-2 rounded-full ${r.bar}`} style={{ width: width(r.value) }} />}
          </div>
        </div>
      ))}
    </div>
  );
}
