/**
 * Determinate progress (e.g. OCR), `value` 0–100. `label` names the bar;
 * `liveText` ("Reading the photo… 40%") is shown and announced politely.
 */
export function ProgressBar({ value, label, liveText }: { value: number; label: string; liveText?: string }) {
  const v = Number.isFinite(value) ? Math.round(Math.min(100, Math.max(0, value))) : 0;
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
      <p aria-live="polite" className="mt-2 text-callout text-label-2">
        {liveText}
      </p>
    </div>
  );
}
