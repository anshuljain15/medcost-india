"use client";

import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { formatINR } from "@/lib/format";
import { cx } from "./href";

/** left + translateX(-p%) keeps a label inside the bar at 0% and at 100%. */
function pin(p: number): React.CSSProperties {
  return { left: `${p}%`, transform: `translateX(-${p}%)` };
}

/** Minimum clear space between the two end labels, in px. */
const LABEL_GAP = 8;

/**
 * The market band on a track, with the person's amount as a marker and chip.
 * The whole graphic is one role="img" named by `ariaLabel` (quote.rangeAria),
 * so its visible labels are presentational.
 *
 * Axis = [min(low, amount) - 10% of span, max(high, amount) + 10% of span].
 *
 * The end labels sit under the band ends. When the amount is far outside the
 * range the band is short and the two labels would overlap, so the high label
 * drops to a second line (measured after layout and on every resize, so it
 * holds for 7-digit amounts, the Hindi prefixes and any screen width).
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
  const { t, locale } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const lowRef = useRef<HTMLSpanElement>(null);
  const highRef = useRef<HTMLSpanElement>(null);

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

  // Stagger the end labels when they would collide. Written straight to a
  // data attribute (not state), so there is no extra render and no flash:
  // layout effects and ResizeObserver callbacks both run before paint.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    const lowEl = lowRef.current;
    const highEl = highRef.current;
    if (!wrap || !track || !lowEl || !highEl) return;
    const measure = () => {
      const width = track.offsetWidth;
      const a = pLow / 100;
      const b = pHigh / 100;
      // pin(): left = p·W − p·w, so a label spans [p(W − w), p(W − w) + w].
      const lowRight = a * width + (1 - a) * lowEl.offsetWidth;
      const highLeft = b * width - b * highEl.offsetWidth;
      wrap.dataset.stagger = highLeft - lowRight < LABEL_GAP ? "true" : "false";
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    // The labels are absolutely positioned (so blockified): their size is
    // observable, which catches the md prefixes, font swaps and locale changes.
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    observer.observe(lowEl);
    observer.observe(highEl);
    return () => observer.disconnect();
  }, [pLow, pHigh, locale]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={ariaLabel}
      className="group/range relative pt-10 pb-7 data-[stagger=true]:pb-14"
    >
      <div ref={trackRef} className="relative h-2 rounded-full bg-fill">
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
          ref={lowRef}
          className="absolute top-4 whitespace-nowrap text-footnote tabular-nums text-label-2"
          style={pin(pLow)}
        >
          <span className="hidden md:inline">{t("quote.lowEnd")} </span>
          {formatINR(lo)}
        </span>
        <span
          ref={highRef}
          className="absolute top-4 whitespace-nowrap text-footnote tabular-nums text-label-2 group-data-[stagger=true]/range:top-10"
          style={pin(pHigh)}
        >
          <span className="hidden md:inline">{t("quote.highEnd")} </span>
          {formatINR(hi)}
        </span>
      </div>
    </div>
  );
}
