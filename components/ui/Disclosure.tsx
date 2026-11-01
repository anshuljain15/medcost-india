import { Icon } from "./Icon";
import { cx } from "./href";

/**
 * Native <details>: keyboard, state and find-in-page for free. The global CSS
 * hides the default marker; the chevron rotates when open.
 *
 * The inline variant sits inside InsetGroup rows and Cards, whose
 * overflow-hidden would clip an outside focus ring to one line, so its
 * summary draws the ring inset (as ListRow does).
 */
export function Disclosure({
  summary,
  variant = "card",
  defaultOpen,
  id,
  children,
}: {
  summary: React.ReactNode;
  variant?: "card" | "inline";
  defaultOpen?: boolean;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className={cx("group", variant === "card" ? "rounded-card bg-surface" : "border-t border-hairline")}
    >
      <summary
        className={cx(
          "flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4 text-headline text-label",
          variant === "inline" && "focus-visible:outline-offset-[-3px]"
        )}
      >
        <span>{summary}</span>
        <Icon
          name="chevron-down"
          className="size-5 shrink-0 text-label-2 transition-transform duration-250 group-open:rotate-180"
        />
      </summary>
      <div className="space-y-3 px-4 pb-4 text-body text-label-2">{children}</div>
    </details>
  );
}
