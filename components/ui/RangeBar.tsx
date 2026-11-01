"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { formatINR } from "@/lib/format";
import { cx } from "./href";

/** left + translateX(-p%) keeps a label inside the bar at 0% and at 100%. */
function pin(p: number): React.CSSProperties {
  return { left: `${p}%`, transform: `translateX(-${p}%)` };
}

/**
 * The market band on a track, with the person's amount as a marker and chip.
 * The whole graphic is one role="img" named by `ariaLabel` (quote.rangeAria),
 * so its visible labels are presentational.
 *
 * Axis = [min(low, amount) - 10% of span, max(high, amount) + 10% of span].
 */
export function RangeBar({
  low,
  high,
  amount,
  above,
  ariaLabel,
}: {
  low: number;
  high: number;
  amount?: number;
  above?: boolean;
  ariaLabel: string;
}) {
  const { t } = useTranslation();
  const hasAmount = typeof amount === "number" && Number.isFinite(amount);
  const lo = Math.min(low, high);
  const hi = Math.max(low, high);
  const dataMin = hasAmount ? Math.min(lo, amount) : lo;
  const dataMax = hasAmount ? Math.max(hi, amount) : hi;
  const span = dataMax - dataMin || Math.max(Math.abs(dataMax), 1);
  const axisMin = dataMin - span * 0.1;
  const axisMax = dataMax + span * 0.1;
  const pos = (v: number) => {
    const p = ((v - axisMin) / (axisMax - axisMin)) * 100;
    return Math.round(Math.min(100, Math.max(0, p)) * 100) / 100;
  };
  const pLow = pos(lo);
  const pHigh = pos(hi);
  const pAmount = hasAmount ? pos(amount) : 0;

  return (
    <div role="img" aria-label={ariaLabel} className="relative pt-10 pb-7">
      <div className="relative h-2 rounded-full bg-fill">
        <div
          className="absolute inset-y-0 rounded-full bg-range-band"
          style={{ left: `${pLow}%`, width: `${Math.max(pHigh - pLow, 0.5)}%` }}
        />
        {hasAmount && (
          <>
            <div
              className={cx(
                "absolute -top-1.5 h-5 w-1 rounded-full ring-2 ring-surface",
                above ? "bg-warn-icon" : "bg-range-marker"
              )}
              style={pin(pAmount)}
            />
            <span
              className="absolute -top-9 whitespace-nowrap rounded-full bg-elevated px-2.5 py-1 text-footnote font-semibold tabular-nums text-label shadow-pop"
              style={pin(pAmount)}
            >
              {t("quote.yourAmount", { amount: formatINR(amount) })}
            </span>
          </>
        )}
        <span
          className="absolute top-4 whitespace-nowrap text-footnote tabular-nums text-label-2"
          style={pin(pLow)}
        >
          <span className="hidden md:inline">{t("quote.lowEnd")} </span>
          {formatINR(lo)}
        </span>
        <span
          className="absolute top-4 whitespace-nowrap text-footnote tabular-nums text-label-2"
          style={pin(pHigh)}
        >
          <span className="hidden md:inline">{t("quote.highEnd")} </span>
          {formatINR(hi)}
        </span>
      </div>
    </div>
  );
}
