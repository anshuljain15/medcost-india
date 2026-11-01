import { Icon, type IconName } from "./Icon";
import { cx } from "./href";

type Tone = "info" | "warn" | "danger";

const TONE: Record<Tone, { box: string; icon: string; defaultIcon: IconName }> = {
  info: { box: "bg-fill text-label", icon: "text-label-2", defaultIcon: "info" },
  warn: { box: "bg-warn-bg text-warn-fg", icon: "text-warn-icon", defaultIcon: "alert" },
  danger: { box: "bg-danger-bg text-danger-fg", icon: "", defaultIcon: "alert" },
};

/**
 * Icon + words, never colour alone. warn means "above"/"check this"; danger
 * is for form validation only.
 */
export function Callout({
  tone = "info",
  title,
  icon,
  children,
}: {
  tone?: Tone;
  title?: string;
  icon?: IconName;
  children: React.ReactNode;
}) {
  const s = TONE[tone];
  return (
    <div className={cx("flex gap-3 rounded-card p-4 text-callout", s.box)}>
      <Icon name={icon ?? s.defaultIcon} className={cx("mt-0.5 size-5 shrink-0", s.icon)} />
      <div className="min-w-0 space-y-1">
        {title && <p className="text-headline">{title}</p>}
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  );
}
