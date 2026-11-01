"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Icon, type IconName } from "./Icon";
import { useAnnounce } from "./LiveRegion";
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
 * focus to it (via `headingRef`) on submit. Later edits that change the
 * verdict (a new amount, Quote/Final bill) announce only the strip and the
 * sentence, once typing pauses, through the shared polite live region. The
 * section itself is not a live region, so the lists, the range bar and the
 * source note are never read out again on every keystroke. Plain <ul>s in
 * `children` get the bullet-list recipe.
 */
export function VerdictCard({
  status,
  sentence,
  spokenSentence,
  headingRef,
  children,
}: {
  status: Verdict;
  /** The sentence; a node when part of it is data text (a procedure name in a Hindi sentence). */
  sentence: React.ReactNode;
  /** The sentence as plain text for the announcement; required when `sentence` is not a string. */
  spokenSentence?: string;
  headingRef?: React.Ref<HTMLHeadingElement>;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const announce = useAnnounce();
  const v = VERDICT[status];
  const spoken = spokenSentence ?? (typeof sentence === "string" ? sentence : "");
  const message = `${t(`quote.status.${status}`)}. ${spoken}`.trim();
  // The verdict on mount is reached by focus, not announced. Only a change
  // after that is, 600ms after the last edit (as the search counts are).
  const lastMessage = useRef(message);
  useEffect(() => {
    if (message === lastMessage.current) return;
    lastMessage.current = message;
    const timer = window.setTimeout(() => announce(message), 600);
    return () => window.clearTimeout(timer);
  }, [message, announce]);
  return (
    <section className="overflow-hidden rounded-card bg-surface">
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
