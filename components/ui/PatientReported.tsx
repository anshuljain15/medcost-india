"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Icon } from "./Icon";

/**
 * The patient-reported layer: a separate, dashed box (the only dashed element
 * on the site), labelled "Reported by patients · not verified". It is never a
 * source, never mixed into sourced ranges, never names a hospital, and its
 * medians use text-title3 (never text-figure, never accent). Keep it in its
 * own section, at least one heading away from any SourceNote.
 */
export function PatientReported({ count, children }: { count?: number; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <section className="rounded-card border border-dashed border-control bg-surface-2 p-5">
      <p className="flex items-center gap-2 text-footnote font-semibold text-label-2">
        <Icon name="users" className="size-5 shrink-0" />
        <span>
          {t("source.patientLabel")}
          {typeof count === "number" && ` · ${t("source.patientCount", { n: count })}`}
        </span>
      </p>
      <div className="mt-4 space-y-4 text-body text-label">{children}</div>
    </section>
  );
}
