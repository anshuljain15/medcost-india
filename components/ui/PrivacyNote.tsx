import { Icon } from "./Icon";

/** "Your photo stays on this phone." Placed directly next to every photo button. */
export function PrivacyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-callout text-label-2">
      <Icon name="lock" className="mt-0.5 size-5 shrink-0 text-success-icon" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
