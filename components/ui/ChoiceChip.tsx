import { Icon } from "./Icon";
import { cx } from "./href";

const CHIP =
  "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-control bg-surface px-4 text-callout font-medium text-label transition-colors duration-150 hover:bg-fill peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent-strong aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent-strong peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus";

/**
 * 44px pill. radio / checkbox wrap a visually hidden native input; toggle is a
 * <button aria-pressed> (e.g. OCR word chips, which are offered, never
 * auto-searched). The selected chip also shows a check icon, so state is never
 * shown by colour alone.
 */
export function ChoiceChip({
  type,
  name,
  value,
  checked,
  onChange,
  children,
}: {
  type: "radio" | "checkbox" | "toggle";
  name?: string;
  value?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  const check = checked && <Icon name="check" className="size-4 shrink-0" />;
  if (type === "toggle") {
    return (
      <button type="button" aria-pressed={checked} onClick={() => onChange(!checked)} className={cx(CHIP, "shrink-0")}>
        {check}
        <span>{children}</span>
      </button>
    );
  }
  return (
    <label className="relative inline-flex shrink-0">
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className={CHIP}>
        {check}
        <span>{children}</span>
      </span>
    </label>
  );
}

/**
 * A row of chips. Default: one line that scrolls sideways, bleeding to the
 * screen edge. `wrap`: wraps onto more lines. `label` names the group.
 */
export function ChipRow({ wrap, label, children }: { wrap?: boolean; label?: string; children: React.ReactNode }) {
  return (
    <div
      role={label ? "group" : undefined}
      aria-label={label}
      className={
        wrap
          ? "flex flex-wrap gap-2"
          : // py-1.5 leaves room for the 3px + 2px-offset focus ring inside the scroller.
            "-mx-4 flex gap-2 overflow-x-auto px-4 py-1.5 [scrollbar-width:none]"
      }
    >
      {children}
    </div>
  );
}
