import { buttonClass } from "./Button";
import { Icon } from "./Icon";
import { cx } from "./href";

/**
 * A file input that looks like a button. No `capture` attribute, so Android
 * offers Camera or Gallery (WhatsApp photos work). The photo is read in the
 * browser by the caller; put a PrivacyNote directly next to it.
 */
export function PhotoInput({
  label,
  variant = "primary",
  onFile,
  disabled,
}: {
  label: string;
  variant?: "primary" | "tonal" | "plain";
  onFile: (f: File) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cx(
        buttonClass({ variant, disabled }),
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
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so picking the same photo again still fires a change.
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}
