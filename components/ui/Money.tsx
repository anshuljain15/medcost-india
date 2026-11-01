"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { formatINR, formatINRUnit, lakhParts } from "@/lib/format";

function isAmount(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * The only way money reaches the screen: formatINR / formatINRUnit, tabular,
 * never broken across lines. null (and NaN) render "Not listed", never "₹NaN".
 */
export function Money({ value, perUnit }: { value: number | null; perUnit?: boolean }) {
  const { t } = useTranslation();
  if (!isAmount(value)) return <span className="text-label-2">{t("common.notListed")}</span>;
  return <span className="tabular-nums whitespace-nowrap">{perUnit ? formatINRUnit(value) : formatINR(value)}</span>;
}

/**
 * "₹1,70,000 – ₹6,90,000". Each number is unbreakable and a no-break space
 * holds the dash to the low end, so the line can wrap only after the dash.
 *
 * With only one end known it says so in words ("From ₹4,000" / "₹4,000 से
 * शुरू", "Up to ₹9,000" / "₹9,000 तक"), never "₹4,000 – Not listed".
 */
export function MoneyRange({
  low,
  high,
  perUnit,
}: {
  low: number | null;
  high: number | null;
  perUnit?: boolean;
}) {
  const { t } = useTranslation();
  if (!isAmount(low) && !isAmount(high)) return <span className="text-label-2">{t("common.notListed")}</span>;
  if (isAmount(low) && isAmount(high) && low === high) return <Money value={low} perUnit={perUnit} />;
  if (isAmount(low) !== isAmount(high)) {
    // A translated phrase with <Money> in place of {amount}, so the figure
    // still goes through Money and stays unbreakable.
    const marker = "\u0000";
    const text = t(isAmount(low) ? "common.fromAmount" : "common.upToAmount", { amount: marker });
    const at = text.indexOf(marker);
    const amount = <Money value={isAmount(low) ? low : high} perUnit={perUnit} />;
    if (at < 0) return amount;
    return (
      <span className="tabular-nums">
        {text.slice(0, at)}
        {amount}
        {text.slice(at + marker.length)}
      </span>
    );
  }
  return (
    <span className="tabular-nums">
      <Money value={low} perUnit={perUnit} />
      <span className="text-label-2">{" – "}</span>
      <Money value={high} perUnit={perUnit} />
    </span>
  );
}

/**
 * "about ₹1.7–6.9 lakh" under an exact figure: a reading aid, never the hero.
 * Low rounds down and high rounds up (lakhParts), so it is never narrower than
 * the source. Renders nothing under ₹1 lakh.
 */
export function LakhCaption({ low, high }: { low: number; high: number }) {
  const { t } = useTranslation();
  const parts = lakhParts(low, high);
  if (!parts) return null;
  const crore = parts.unit === "crore";
  const text =
    parts.low === parts.high
      ? t(crore ? "common.croreOne" : "common.lakhOne", { n: parts.low })
      : t(crore ? "common.croreRange" : "common.lakhRange", { low: parts.low, high: parts.high });
  return <p className="mt-1 text-callout text-label-2">{text}</p>;
}
