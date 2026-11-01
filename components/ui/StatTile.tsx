import { Icon } from "./Icon";

/** Label over a big tabular value. tone="warn" adds the alert icon (never colour alone). */
export function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "warn";
}) {
  const warn = tone === "warn";
  return (
    <div className="rounded-card bg-surface p-4">
      <p className="text-footnote font-semibold text-label-2">{label}</p>
      <p
        className={
          warn
            ? "mt-1 flex items-center gap-1.5 text-title2 tabular-nums text-warn-fg"
            : "mt-1 text-title2 tabular-nums text-label"
        }
      >
        {warn && <Icon name="alert" className="size-5 shrink-0 text-warn-icon" />}
        <span>{value}</span>
      </p>
    </div>
  );
}
