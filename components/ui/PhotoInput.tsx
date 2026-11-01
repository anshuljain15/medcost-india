import { buttonClass } from "./Button";
import { Icon } from "./Icon";
import { cx } from "./href";

/**
 * A file input that looks like a button. No `capture` attribute, so Android
 * offers Camera or Gallery (WhatsApp photos work). The photo is read in the
 * browser by the caller; put a PrivacyNote directly next to it.
 *
 * `disabled` (e.g. while a photo is being read) uses aria-disabled, not the
 * native attribute: a natively disabled input drops keyboard focus to <body>
 * mid-task, while this one keeps its place in the Tab order and simply opens
 * nothing. `block` is full width below 768px, like Button's.
 */
export function PhotoInput({
  label,
  variant = "primary",
  onFile,
  disabled,
  block,
}: {
  label: string;
  variant?: "primary" | "tonal" | "plain";
  onFile: (f: File) => void;
  disabled?: boolean;
  block?: boolean;
}) {
  return (
    <label
      className={cx(
        buttonClass({ variant, disabled, block }),
        !disabled && "cursor-pointer",
        "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
      )}
    >
      <Icon name="camera" className="size-5 shrink-0" />
      <span>{label}</span>
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        aria-disabled={disabled || undefined}
        onClick={(e) => {
          // Keeps the file picker shut while busy; the label's click reaches the
          // input, so this one guard covers mouse, touch and keyboard.
          if (disabled) e.preventDefault();
        }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so picking the same photo again still fires a change.
          e.target.value = "";
          if (disabled) return;
          if (file) onFile(file);
        }}
      />
    </label>
  );
}
