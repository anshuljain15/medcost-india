import { Icon, type IconName } from "./Icon";
import { cx } from "./href";

type Tone = "neutral" | "accent" | "warn" | "success";

const TONE: Record<Tone, string> = {
  neutral: "bg-fill text-label",
  accent: "bg-accent-soft text-accent-strong",
  warn: "bg-warn-bg text-warn-fg",
  success: "bg-success-bg text-success-fg",
};

/** 13px label chip. Not interactive. Status badges carry an icon as well as the word. */
export function Badge({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: Tone;
  icon?: IconName;
  children: React.ReactNode;
}) {
  return (
    <span className={cx("inline-flex min-h-6 items-center gap-1 rounded-badge px-2 text-caption", TONE[tone])}>
      {icon && <Icon name={icon} className="size-3.5 shrink-0" />}
      {children}
    </span>
  );
}
