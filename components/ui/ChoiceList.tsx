import { FieldError, errorId, hintId } from "./fieldParts";
import { Icon } from "./Icon";

/**
 * A question with radio or checkbox answers as 56px rows. The legend is the
 * question (an H1 inside the legend on one-question screens). The first
 * input's id is `name`, so an ErrorSummary link to `#name` lands on it.
 * An option's `reveal` shows under it while it is selected.
 */
export function ChoiceList({
  name,
  legend,
  legendAsH1,
  hint,
  error,
  type,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: React.ReactNode;
  legendAsH1?: boolean;
  hint?: string;
  error?: string;
  type: "radio" | "checkbox";
  options: { value: string; label: string; hint?: string; reveal?: React.ReactNode }[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
}) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const described = [hint ? hintId(name) : null, error ? errorId(name) : null].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset className="min-w-0" aria-describedby={described}>
      <legend className={legendAsH1 ? undefined : "text-headline text-label"}>
        {legendAsH1 ? <h1 className="text-title1 text-label text-balance">{legend}</h1> : legend}
      </legend>
      {hint && (
        <p id={hintId(name)} className="mt-2 text-callout text-label-2">
          {hint}
        </p>
      )}
      <FieldError id={name} message={error} />
      <div className="mt-4 space-y-2">
        {options.map((o, i) => {
          const inputId = i === 0 ? name : `${name}-${i}`;
          const optionHintId = o.hint ? `${name}-opt-${i}-hint` : undefined;
          const checked = selected.includes(o.value);
          const toggle = () => {
            if (type === "radio") onChange(o.value);
            else onChange(checked ? selected.filter((v) => v !== o.value) : [...selected, o.value]);
          };
          return (
            <div key={o.value}>
              <label
                htmlFor={inputId}
                className="flex min-h-14 cursor-pointer items-center gap-3 rounded-control border border-control bg-surface px-4 py-3 text-body text-label has-[:checked]:border-2 has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
              >
                {type === "radio" ? (
                  <input
                    id={inputId}
                    type="radio"
                    name={name}
                    value={o.value}
                    checked={checked}
                    onChange={toggle}
                    aria-describedby={optionHintId}
                    className="size-6 shrink-0 appearance-none rounded-full border-2 border-control checked:border-[7px] checked:border-accent"
                  />
                ) : (
                  <span className="grid size-6 shrink-0 place-items-center">
                    <input
                      id={inputId}
                      type="checkbox"
                      name={name}
                      value={o.value}
                      checked={checked}
                      onChange={toggle}
                      aria-describedby={optionHintId}
                      className="col-start-1 row-start-1 size-6 appearance-none rounded-md border-2 border-control checked:border-accent checked:bg-accent"
                    />
                    {checked && (
                      <Icon
                        name="check"
                        className="pointer-events-none col-start-1 row-start-1 size-4 text-accent-fg"
                      />
                    )}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block">{o.label}</span>
                  {o.hint && (
                    <span id={optionHintId} className="block text-callout text-label-2">
                      {o.hint}
                    </span>
                  )}
                </span>
              </label>
              {checked && o.reveal && <div className="mt-2 ml-9 space-y-4">{o.reveal}</div>}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
