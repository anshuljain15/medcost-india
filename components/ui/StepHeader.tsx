"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Button } from "./Button";

/** Back (when there is a previous step), "Step n of N" and a thin progress bar. */
export function StepHeader({ step, total, onBack }: { step: number; total: number; onBack?: () => void }) {
  const { t } = useTranslation();
  const caption = t("share.stepOf", { n: step, total });
  const pct = total > 0 ? Math.min(100, Math.max(0, (step / total) * 100)) : 0;
  return (
    <div>
      {onBack && (
        <Button variant="plain" icon="chevron-left" onClick={onBack}>
          {t("share.back")}
        </Button>
      )}
      <p className="mt-2 text-footnote text-label-2">{caption}</p>
      <div
        role="progressbar"
        aria-label={caption}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={step}
        aria-valuetext={caption}
        className="mt-2 h-1 rounded-full bg-fill"
      >
        <div
          className="h-1 rounded-full bg-accent transition-[width] duration-250 ease-standard"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
