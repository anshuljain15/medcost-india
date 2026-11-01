/**
 * Determinate progress (e.g. OCR), `value` 0–100. `label` names the bar.
 *
 * `text` ("Reading the photo… (40%)") is shown. With `stage` ("Loading the
 * text reader…", "Reading the photo"), only the stage is announced (politely,
 * once per change) and `text` is not a live region: a percentage that changes
 * every few seconds would otherwise be read out up to ten times per photo. The
 * exact figure stays available as the bar's aria-valuenow. Without `stage`,
 * `text` itself is the polite live region.
 */
export function ProgressBar({
  value,
  label,
  text,
  stage,
}: {
  value: number;
  label: string;
  text?: string;
  stage?: string;
}) {
  const v = Number.isFinite(value) ? Math.round(Math.min(100, Math.max(0, value))) : 0;
  const staged = stage !== undefined;
  return (
    <div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        className="mt-2 h-1 rounded-full bg-fill"
      >
        <div
          className="h-1 rounded-full bg-accent transition-[width] duration-250 ease-standard"
          style={{ width: `${v}%` }}
        />
      </div>
      <p
        aria-live={staged ? undefined : "polite"}
        aria-hidden={staged ? true : undefined}
        className="mt-2 text-callout text-label-2"
      >
        {text}
      </p>
      {staged && (
        <p aria-live="polite" className="sr-only">
          {stage}
        </p>
      )}
    </div>
  );
}
