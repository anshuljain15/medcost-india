"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Icon, type IconName } from "./Icon";
import { cx } from "./href";

type Verdict = "within" | "above" | "below" | "unknown";

// Amber means only "above". Within / below / unknown are neutral: never teal
// (it looks tappable) and never green (it reads as approval).
const VERDICT: Record<Verdict, { strip: string; icon: IconName; iconClass: string }> = {
  above: { strip: "bg-warn-bg text-warn-fg", icon: "alert", iconClass: "text-warn-icon" },
  within: { strip: "bg-fill text-label", icon: "check-circle", iconClass: "text-label-2" },
  below: { strip: "bg-fill text-label", icon: "arrow-down-circle", iconClass: "text-label-2" },
  unknown: { strip: "bg-fill text-label", icon: "info", iconClass: "text-label-2" },
};

/**
 * The result of a check. The strip is an H2 with tabIndex -1: the page moves
 * focus to it (via `headingRef`) on submit, and the section is a polite live
 * region so later edits are announced. Plain <ul>s in `children` get the
 * bullet-list recipe.
 */
export function VerdictCard({
  status,
  sentence,
  headingRef,
  children,
}: {
  status: Verdict;
  sentence: string;
  headingRef?: React.Ref<HTMLHeadingElement>;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const v = VERDICT[status];
  return (
    <section aria-live="polite" className="overflow-hidden rounded-card bg-surface">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className={cx("flex items-center gap-2 px-5 py-3 text-headline focus:outline-none", v.strip)}
      >
        <Icon name={v.icon} className={cx("size-5 shrink-0", v.iconClass)} />
        <span>{t(`quote.status.${status}`)}</span>
      </h2>
      <div className="space-y-5 p-5 [&_ul:not([class])]:list-disc [&_ul:not([class])]:space-y-2 [&_ul:not([class])]:pl-5 [&_ul:not([class])]:text-body [&_ul:not([class])]:text-label [&_ul:not([class])]:marker:text-label-3">
        <p className="text-title3 text-label">{sentence}</p>
        {children}
      </div>
    </section>
  );
}

type LineStatus = "above" | "within" | "noCeiling" | "checkUnits" | "pick";

/**
 * One bill line's status: icon + word, then the sentence. Only "above" is
 * amber; "checkUnits" is neutral, never a flag.
 */
export function StatusLine({ status, label, sentence }: { status: LineStatus; label: string; sentence?: string }) {
  const above = status === "above";
  const icon: IconName = above ? "alert" : status === "within" ? "check-circle" : "info";
  return (
    <div className="flex gap-2">
      <Icon name={icon} className={cx("mt-0.5 size-5 shrink-0", above ? "text-warn-icon" : "text-label-2")} />
      <div className="min-w-0">
        <p className={cx("text-headline", above ? "text-warn-fg" : "text-label")}>{label}</p>
        {sentence && <p className="text-body text-label">{sentence}</p>}
      </div>
    </div>
  );
}
