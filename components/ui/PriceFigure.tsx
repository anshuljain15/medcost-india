import { LakhCaption, Money, MoneyRange } from "./Money";

/**
 * One price block: label, the exact figure (the hero), the lakh caption,
 * an optional qualifier, then `children`, which is the SourceNote. Every
 * price block is followed directly by its SourceNote.
 *
 * `high` omitted = a single official figure; `high` passed (even null) = a range.
 */
export function PriceFigure({
  label,
  low,
  high,
  perUnit,
  qualifier,
  children,
}: {
  label: string;
  low: number | null;
  high?: number | null;
  perUnit?: boolean;
  qualifier?: string;
  children?: React.ReactNode;
}) {
  const single = high === undefined;
  const captionHigh = single ? low : high;
  return (
    <div>
      <p className="text-footnote font-semibold text-label-2">{label}</p>
      <p className="mt-1 text-figure tabular-nums text-label">
        {single ? <Money value={low} perUnit={perUnit} /> : <MoneyRange low={low} high={high} perUnit={perUnit} />}
      </p>
      {!perUnit && low !== null && captionHigh !== null && captionHigh !== undefined && (
        <LakhCaption low={low} high={captionHigh} />
      )}
      {qualifier && <p className="mt-1 text-callout text-label-2">{qualifier}</p>}
      {children}
    </div>
  );
}
