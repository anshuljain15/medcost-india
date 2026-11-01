import { Icon } from "./Icon";

/** Shared by TextField, MoneyField, PinField, Select and Combobox. */
export type FieldBase = { id: string; label: React.ReactNode; hint?: React.ReactNode; error?: string };

/**
 * Input recipe without horizontal padding: each field adds its own (px-4,
 * pl-9, pr-11…) so two padding utilities never compete. text-body on every
 * input keeps iOS and Android from zooming on focus.
 */
export const INPUT_CLASS =
  "h-14 w-full rounded-control border border-control bg-surface text-body text-label placeholder:text-label-3 transition-colors duration-150 focus-visible:border-accent aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger-fg";

export const hintId = (id: string) => `${id}-hint`;
export const errorId = (id: string) => `${id}-error`;

/** aria-describedby for a field: hint, then error, then anything extra. */
export function describedBy(id: string, hint: unknown, error: unknown, ...extra: (string | undefined | false)[]) {
  const ids = [hint ? hintId(id) : undefined, error ? errorId(id) : undefined, ...extra].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export function FieldLabel({ htmlFor, id, children }: { htmlFor: string; id?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} id={id} className="mb-1 block text-headline text-label">
      {children}
    </label>
  );
}

export function FieldHint({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={hintId(id)} className="mb-2 text-callout text-label-2">
      {children}
    </p>
  );
}

/** Inline error: alert icon + words, linked to the control by aria-describedby. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={errorId(id)} className="mt-2 flex gap-1.5 text-callout font-medium text-danger-fg">
      <Icon name="alert" className="mt-0.5 size-4.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
